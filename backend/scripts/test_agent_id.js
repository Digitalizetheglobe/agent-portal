const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const assert = require('assert');
const { getAgencyCode, generateAgentCode, isStandardAgentCode } = require('../utils/agentId');
const { getCountryCode, isValidCountry } = require('../utils/countries');
const { sequelize, User } = require('../models');

async function runTests() {
  console.log('--- Testing Agency Code and Countries ---');

  // Test 1: Global Education Agency / India -> GEA IND
  assert.strictEqual(getAgencyCode({ agencyName: 'Global Education Agency' }), 'GEA');
  assert.strictEqual(getCountryCode('India'), 'IND');
  console.log('✓ Global Education Agency / India -> GEA IND');

  // Test 2: The Star Education / Mauritius -> STE MUS
  assert.strictEqual(getAgencyCode({ agencyName: 'The Star Education' }), 'STE');
  assert.strictEqual(getCountryCode('Mauritius'), 'MUS');
  console.log('✓ The Star Education / Mauritius -> STE MUS');

  // Test 3: Acme / Maldives -> ACM MDV
  assert.strictEqual(getAgencyCode({ agencyName: 'Acme' }), 'ACM');
  assert.strictEqual(getCountryCode('Maldives'), 'MDV');
  console.log('✓ Acme / Maldives -> ACM MDV');

  // Test 4: 2 letters -> padded with X
  assert.strictEqual(getAgencyCode({ name: 'Ed', agentType: 'individual' }), 'EDX');
  console.log('✓ 2-letter name "Ed" -> EDX');

  // Test 5: 1 letter -> padded with 2 Xs
  assert.strictEqual(getAgencyCode({ name: 'A', agentType: 'individual' }), 'AXX');
  console.log('✓ 1-letter name "A" -> AXX');

  // Test 6: Word filtering (and, of, &)
  assert.strictEqual(getAgencyCode({ agencyName: 'Education and Training Center' }), 'ETC');
  assert.strictEqual(getAgencyCode({ agencyName: 'College of Arts & Science' }), 'CAS');
  console.log('✓ Word filtering for "and", "of", "&"');

  // Test 7: Validation errors
  try {
    getAgencyCode({ agencyName: '   ' });
    assert.fail('Should have thrown on blank name');
  } catch (err) {
    assert.strictEqual(err.statusCode, 400);
    console.log('✓ Blank agency name throws 400');
  }

  try {
    await generateAgentCode({ name: 'Valid Agent', agencyName: 'Valid Agency' }, {});
    assert.fail('Should have thrown on missing country');
  } catch (err) {
    assert.strictEqual(err.statusCode, 400);
    console.log('✓ Missing country throws 400');
  }

  try {
    await generateAgentCode({ name: 'Valid Agent', country: 'Atlantis' }, {});
    assert.fail('Should have thrown on invalid country');
  } catch (err) {
    assert.strictEqual(err.statusCode, 400);
    console.log('✓ Invalid country throws 400');
  }

  console.log('\n--- Testing Concurrent Advisory Locking with DB ---');
  await sequelize.authenticate();

  // Test 2 concurrent approvals running simultaneously in separate transactions
  const agent1 = { agencyName: 'Global Education Agency', country: 'India' };
  const agent2 = { agencyName: 'The Star Education', country: 'Mauritius' };

  let code1, code2;

  // We run two transactions simultaneously
  await Promise.all([
    sequelize.transaction(async (t1) => {
      code1 = await generateAgentCode(agent1, t1);
    }),
    sequelize.transaction(async (t2) => {
      code2 = await generateAgentCode(agent2, t2);
    })
  ]);

  console.log(`Generated code 1: ${code1}`);
  console.log(`Generated code 2: ${code2}`);

  // In this test, both transactions ran. Since neither committed a User with agentCode,
  // serial 1 was generated in both (or in sequential commits if committed).
  // Now let's test serial increment with actual rows in a rollback transaction:
  await sequelize.transaction(async (t) => {
    // Generate first code
    const c1 = await generateAgentCode(agent1, t);
    // Create a temporary user in this transaction
    await User.create({
      name: 'Temp Agent 1',
      email: 'temp1@test.com',
      password: 'Str0ngP@ssw0rd!2026',
      role: 'agent',
      agentCode: c1,
      country: 'India'
    }, { transaction: t });

    // Generate second code within transaction
    const c2 = await generateAgentCode(agent2, t);
    console.log(`Sequential in-transaction codes: c1 = ${c1}, c2 = ${c2}`);

    const serial1 = parseInt(c1.match(/^[A-Z]{3}(\d{4,})[A-Z]{3}$/)[1], 10);
    const serial2 = parseInt(c2.match(/^[A-Z]{3}(\d{4,})[A-Z]{3}$/)[1], 10);
    assert.strictEqual(serial2, serial1 + 1, 'Serial 2 must be Serial 1 + 1');

    console.log(`✓ Serial successfully incremented from ${serial1} to ${serial2}`);

    // Rollback so we don't pollute the DB
    throw new Error('ROLLBACK_TEST_INTENTIONAL');
  }).catch((err) => {
    if (err.message !== 'ROLLBACK_TEST_INTENTIONAL') throw err;
  });

  console.log('\n✅ All tests passed successfully!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
