const { User, sequelize: defaultSequelize } = require('../models');
const { Op } = require('sequelize');
const { getCountryCode } = require('./countries');

const AGENT_ID_REGEX = /^[A-Z]{3}(\d{4,})[A-Z]{3}$/;

/**
 * Check if a code matches the standardized agent ID format (e.g. GEA0001IND).
 */
const isStandardAgentCode = (code) => {
  return typeof code === 'string' && AGENT_ID_REGEX.test(code.trim());
};

/**
 * Extract the 3-letter agency code from the agent record:
 * - Uses agencyName for company agents; name for individual agents.
 * - Ignores leading "the" (case-insensitive) and the words "and", "of", "&".
 * - If fewer than 3 initials, fills with the following letters of the first word;
 *   if still short, pads with "X".
 * - Uppercase, letters only.
 */
const getAgencyCode = (agent) => {
  if (!agent) {
    const err = new Error('Agent data is required');
    err.statusCode = 400;
    throw err;
  }

  const rawName = agent.agentType === 'individual'
    ? (agent.name || '')
    : (agent.agencyName || agent.name || '');

  if (!rawName || !rawName.trim()) {
    const err = new Error('Agent has no usable name for code generation');
    err.statusCode = 400;
    throw err;
  }

  // Split on whitespace
  let tokens = rawName.trim().split(/\s+/);
  if (tokens.length === 0) {
    const err = new Error('Agent has no usable name for code generation');
    err.statusCode = 400;
    throw err;
  }

  // Ignore leading "the" (case-insensitive)
  if (tokens[0].replace(/[^A-Za-z]/g, '').toLowerCase() === 'the') {
    tokens.shift();
  }

  // Filter out words "and", "of", "&"
  const IGNORED = new Set(['and', 'of', '&']);
  tokens = tokens.filter(t => {
    const clean = t.replace(/[^A-Za-z]/g, '').toLowerCase();
    return !IGNORED.has(t.toLowerCase()) && !IGNORED.has(clean);
  });

  // Clean each token to uppercase letters only
  const words = tokens
    .map(t => t.replace(/[^A-Za-z]/g, '').toUpperCase())
    .filter(w => w.length > 0);

  if (words.length === 0) {
    const err = new Error('Agent name has no usable letters for code generation');
    err.statusCode = 400;
    throw err;
  }

  let code = '';
  if (words.length >= 3) {
    code = words[0][0] + words[1][0] + words[2][0];
  } else if (words.length === 2) {
    // Two words: e.g. "Star Education" -> S, T, E
    if (words[0].length >= 2) {
      code = words[0][0] + words[0][1] + words[1][0];
    } else {
      code = words[0][0] + words[1][0] + 'X';
    }
  } else {
    // One word: e.g. "Acme" -> A, C, M; "Ed" -> E, D, X; "A" -> A, X, X
    const w = words[0];
    code = w[0] + (w[1] || 'X') + (w[2] || 'X');
  }

  return code;
};

/**
 * Generate a unique standardized Agent ID in format:
 * [3-letter agency code] + [4-digit serial] + [3-letter ISO 3166-1 alpha-3 country code]
 * Example: Global Education Agency in India -> GEA0001IND
 *
 * Must be executed within a transaction. Uses pg_advisory_xact_lock to ensure race safety.
 */
const generateAgentCode = async (agent, transaction) => {
  if (!agent) {
    const err = new Error('Agent record is required');
    err.statusCode = 400;
    throw err;
  }

  if (!transaction) {
    const err = new Error('generateAgentCode requires a database transaction');
    err.statusCode = 500;
    throw err;
  }

  if (!agent.country || !String(agent.country).trim()) {
    const err = new Error('Agent country is required to generate an Agent ID');
    err.statusCode = 400;
    throw err;
  }

  const countryCode = getCountryCode(agent.country);
  if (!countryCode) {
    const err = new Error(`Unknown country "${agent.country}". A valid country is required to generate an Agent ID`);
    err.statusCode = 400;
    throw err;
  }

  const agencyCode = getAgencyCode(agent);

  const seq = transaction.sequelize || defaultSequelize;

  // Race-safe advisory transaction lock: serialized counter increment across concurrent requests
  await seq.query('SELECT pg_advisory_xact_lock(47001)', { transaction });

  // Query existing agent codes to find current max serial
  const existingAgents = await User.findAll({
    attributes: ['agentCode'],
    where: {
      agentCode: { [Op.ne]: null }
    },
    transaction,
    raw: true
  });

  let maxSerial = 0;
  for (const row of existingAgents) {
    if (!row.agentCode) continue;
    const match = String(row.agentCode).trim().match(AGENT_ID_REGEX);
    if (match) {
      const serialNum = parseInt(match[1], 10);
      if (serialNum > maxSerial) {
        maxSerial = serialNum;
      }
    }
  }

  const nextSerial = maxSerial + 1;
  const serialStr = nextSerial < 10000
    ? String(nextSerial).padStart(4, '0')
    : String(nextSerial);

  return `${agencyCode}${serialStr}${countryCode}`;
};

module.exports = {
  AGENT_ID_REGEX,
  isStandardAgentCode,
  getAgencyCode,
  generateAgentCode
};
