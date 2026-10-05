const { sequelize } = require('../config/db');
require('../models');

async function migrate() {
  console.log('🔄 Running FA-2 Minimal Database Migration...');
  try {
    await sequelize.authenticate();

    // 1. Add new enum values to PostgreSQL type enum_Invoices_financeReviewStatus if not exists
    console.log('1. Checking enum_Invoices_financeReviewStatus...');
    try {
      await sequelize.query(`ALTER TYPE "enum_Invoices_financeReviewStatus" ADD VALUE IF NOT EXISTS 'CorrectionRequired'`);
      console.log('  - Added CorrectionRequired');
    } catch (e) {
      console.log('  - CorrectionRequired already present or error:', e.message);
    }

    try {
      await sequelize.query(`ALTER TYPE "enum_Invoices_financeReviewStatus" ADD VALUE IF NOT EXISTS 'Resubmitted'`);
      console.log('  - Added Resubmitted');
    } catch (e) {
      console.log('  - Resubmitted already present or error:', e.message);
    }

    // 2. Synchronize new models (CommissionSnapshot, Payoff)
    console.log('2. Synchronizing CommissionSnapshots and Payoffs tables...');
    await sequelize.sync({ alter: true });

    console.log('✅ FA-2 Database Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
