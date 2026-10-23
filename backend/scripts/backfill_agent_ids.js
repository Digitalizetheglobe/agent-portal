/**
 * Backfill script for Agent IDs.
 * Assigns standardized Agent IDs ([Agency 3L] + [4-Digit Serial] + [Country 3L]) to approved agents.
 *
 * Rules:
 * - Only processes approved agents (onboardingStatus === 'approved' or isVerified === true).
 * - Preserves existing agentCodes that already match the standardized format.
 * - Orders assignments by approval date (onboardingDecidedAt / createdAt ASC).
 * - Race-safe with advisory lock when applying changes.
 * - Supports --dry-run to preview assignments without modifying the database.
 * - Skips and lists any agents without a valid country.
 *
 * Usage:
 *   node backend/scripts/backfill_agent_ids.js [--dry-run]
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { User, sequelize } = require('../models');
const { Op } = require('sequelize');
const {
  AGENT_ID_REGEX,
  isStandardAgentCode,
  getAgencyCode
} = require('../utils/agentId');
const { getCountryCode, isValidCountry } = require('../utils/countries');

const isDryRun = process.argv.includes('--dry-run');

async function runBackfill() {
  console.log(`====================================================`);
  console.log(`🚀 Agent ID Backfill Script ${isDryRun ? '(DRY RUN)' : '(LIVE EXECUTION)'}`);
  console.log(`====================================================\n`);

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.\n');

    // Fetch all approved agents ordered by approval date (or creation date)
    const approvedAgents = await User.findAll({
      where: {
        role: 'agent',
        [Op.or]: [
          { onboardingStatus: 'approved' },
          { isVerified: true },
          { verificationStatus: 'approved' }
        ]
      },
      order: [
        [sequelize.fn('COALESCE', sequelize.col('onboardingDecidedAt'), sequelize.col('createdAt')), 'ASC']
      ]
    });

    console.log(`Found ${approvedAgents.length} approved agent(s) to evaluate.`);

    // Find existing max serial across all agents in the database
    const allAgentsWithCodes = await User.findAll({
      attributes: ['agentCode'],
      where: {
        agentCode: { [Op.ne]: null }
      },
      raw: true
    });

    let currentMaxSerial = 0;
    for (const row of allAgentsWithCodes) {
      if (!row.agentCode) continue;
      const match = String(row.agentCode).trim().match(AGENT_ID_REGEX);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > currentMaxSerial) currentMaxSerial = val;
      }
    }

    console.log(`Current highest standard serial number in DB: ${currentMaxSerial}\n`);

    const alreadyStandard = [];
    const skippedNoCountry = [];
    const skippedOtherError = [];
    const toAssign = [];

    for (const agent of approvedAgents) {
      // 1. Skip if already standard format
      if (isStandardAgentCode(agent.agentCode)) {
        alreadyStandard.push({
          id: agent.id,
          name: agent.name,
          agentCode: agent.agentCode,
          country: agent.country
        });
        continue;
      }

      // 2. Validate country
      if (!agent.country || !String(agent.country).trim()) {
        skippedNoCountry.push({
          id: agent.id,
          name: agent.name,
          email: agent.email,
          agentCode: agent.agentCode,
          reason: 'Missing country field'
        });
        continue;
      }

      const countryIso = getCountryCode(agent.country);
      if (!countryIso) {
        skippedNoCountry.push({
          id: agent.id,
          name: agent.name,
          email: agent.email,
          agentCode: agent.agentCode,
          country: agent.country,
          reason: `Invalid country name ("${agent.country}")`
        });
        continue;
      }

      // 3. Extract agency code
      let agencyCode;
      try {
        agencyCode = getAgencyCode(agent);
      } catch (err) {
        skippedOtherError.push({
          id: agent.id,
          name: agent.name,
          email: agent.email,
          agentCode: agent.agentCode,
          reason: err.message
        });
        continue;
      }

      // 4. Compute next serial
      currentMaxSerial += 1;
      const serialStr = currentMaxSerial < 10000
        ? String(currentMaxSerial).padStart(4, '0')
        : String(currentMaxSerial);

      const newAgentCode = `${agencyCode}${serialStr}${countryIso}`;

      toAssign.push({
        agent,
        oldCode: agent.agentCode,
        newCode: newAgentCode,
        country: agent.country,
        countryIso,
        decidedAt: agent.onboardingDecidedAt || agent.createdAt
      });
    }

    // Execution / Dry-run phase
    if (!isDryRun && toAssign.length > 0) {
      await sequelize.transaction(async (t) => {
        await sequelize.query('SELECT pg_advisory_xact_lock(47001)', { transaction: t });

        for (const item of toAssign) {
          const { agent, newCode } = item;
          agent.agentCode = newCode;
          const history = Array.isArray(agent.onboardingHistory) ? [...agent.onboardingHistory] : [];
          history.push({
            action: 'backfill-agent-id',
            at: new Date(),
            agentCode: newCode,
            remarks: `Standardized Agent ID backfilled: ${newCode}`
          });
          agent.onboardingHistory = history;
          await agent.save({ transaction: t });
        }
      });
    }

    // Output summary
    console.log('────────────────────────────────────────────────────');
    console.log('📊 BACKFILL SUMMARY');
    console.log('────────────────────────────────────────────────────');
    console.log(`Total approved agents evaluated:   ${approvedAgents.length}`);
    console.log(`Already in standard format:        ${alreadyStandard.length}`);
    console.log(`${isDryRun ? 'Would be assigned' : 'Successfully assigned'}:           ${toAssign.length}`);
    console.log(`Skipped (missing/invalid country): ${skippedNoCountry.length}`);
    if (skippedOtherError.length > 0) {
      console.log(`Skipped (name/agency errors):      ${skippedOtherError.length}`);
    }
    console.log('────────────────────────────────────────────────────\n');

    if (toAssign.length > 0) {
      console.log(`📋 Assigned IDs (${isDryRun ? 'PREVIEW' : 'COMMITTED'}):`);
      toAssign.forEach((item, index) => {
        console.log(
          `  ${index + 1}. [${item.agent.name}] (${item.country} -> ${item.countryIso}): ` +
          `Old: "${item.oldCode || 'null'}" ➔ New: "${item.newCode}" ` +
          `(Approved: ${item.decidedAt ? new Date(item.decidedAt).toISOString().split('T')[0] : 'N/A'})`
        );
      });
      console.log('');
    }

    if (skippedNoCountry.length > 0) {
      console.log('⚠️  AGENTS REQUIRING A COUNTRY BEFORE BACKFILL:');
      skippedNoCountry.forEach((a, i) => {
        console.log(
          `  ${i + 1}. ID: ${a.id} | Name: "${a.name}" | Email: ${a.email} | ` +
          `Current Code: "${a.agentCode || 'none'}" | Reason: ${a.reason}`
        );
      });
      console.log('\n  Please update these agents with a valid country before re-running.');
    }

    if (skippedOtherError.length > 0) {
      console.log('⚠️  AGENTS WITH NAME ERRORS:');
      skippedOtherError.forEach((a, i) => {
        console.log(`  ${i + 1}. ID: ${a.id} | Name: "${a.name}" | Reason: ${a.reason}`);
      });
      console.log('');
    }

    if (alreadyStandard.length > 0) {
      console.log(`ℹ️  Agents already using standard IDs (${alreadyStandard.length}):`);
      alreadyStandard.forEach((a, i) => {
        console.log(`  ${i + 1}. [${a.name}]: ${a.agentCode}`);
      });
      console.log('');
    }

    if (isDryRun) {
      console.log('🔒 DRY RUN COMPLETE: No changes were written to the database.');
      console.log('   Run without --dry-run to apply these changes.\n');
    } else {
      console.log('✨ BACKFILL COMPLETE: Database updated successfully.\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Backfill failed with error:', error);
    process.exit(1);
  }
}

runBackfill();
