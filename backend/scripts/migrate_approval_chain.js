const { sequelize } = require('../config/db');
require('../models');

// Agent approval chain: adds the 'recommended' and 'verified' onboarding states
// and the "recommended by" columns. Safe to run more than once.
async function migrate() {
  console.log('🔄 Running approval-chain migration...');
  try {
    await sequelize.authenticate();

    for (const value of ['recommended', 'verified']) {
      try {
        await sequelize.query(`ALTER TYPE "enum_Users_onboardingStatus" ADD VALUE IF NOT EXISTS '${value}'`);
        console.log(`  - enum value ${value} ready`);
      } catch (e) {
        console.log(`  - ${value}: ${e.message}`);
      }
    }

    // Adds onboardingRecommendedBy / onboardingRecommendedAt
    await sequelize.sync({ alter: true });

    console.log('✅ Approval-chain migration completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
