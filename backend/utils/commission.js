const { Op } = require('sequelize');
const University = require('../models/University');

// Commission is set by the admin per university (University.commissionRate, a percentage on the
// tuition fee). The agent has no rate of their own. An invoice's commission is the sum over its
// applications of tuition x that application's university rate.

const round2 = (n) => Math.round(n * 100) / 100;

// Parses an admin-supplied rate. Returns { value } (null = clear) or { error }.
const parseCommissionRate = (raw) => {
  if (raw === undefined || raw === null || raw === '') return { value: null };
  const rate = parseFloat(raw);
  if (isNaN(rate) || !isFinite(rate) || rate <= 0 || rate > 100) {
    return { error: 'Commission rate must be a percentage greater than 0 and at most 100' };
  }
  return { value: round2(rate) };
};

// Parses an admin-supplied fixed commission (an amount paid for each student).
const parseFixedAmount = (raw) => {
  if (raw === undefined || raw === null || raw === '') return { value: null };
  const amount = parseFloat(raw);
  if (isNaN(amount) || !isFinite(amount) || amount <= 0 || amount > 99999999) {
    return { error: 'Fixed commission must be an amount greater than 0' };
  }
  return { value: round2(amount) };
};

/**
 * Commission for a set of applications, using each application's university rate.
 * Returns { lines, total, tuitionTotal, blendedRate, missing }:
 *   lines   - one per application: { applicationId, applicationNumber, universityId, universityName, tuition, rate, gross }
 *   missing - names of universities that have no commission rate yet (rate is null in their lines)
 *   blendedRate - total / tuitionTotal as a percentage, for display on the invoice
 */
const computeCommission = async (applications, { transaction } = {}) => {
  const universityIds = [...new Set(applications.map(a => a.universityId).filter(Boolean))];
  const universities = universityIds.length
    ? await University.findAll({
      where: { id: { [Op.in]: universityIds } },
      attributes: ['id', 'name', 'commissionRate', 'commissionType', 'commissionFixedAmount'],
      transaction
    })
    : [];
  const byId = new Map(universities.map(u => [String(u.id), u]));

  const missing = new Set();
  let total = 0;
  let tuitionTotal = 0;

  const lines = applications.map((app) => {
    const university = byId.get(String(app.universityId));
    const tuition = parseFloat(app.tuitionFee) || 0;
    const isFixed = university && university.commissionType === 'fixed';
    let rate = university && university.commissionRate !== null && university.commissionRate !== undefined
      ? parseFloat(university.commissionRate)
      : null;
    let gross = 0;
    if (isFixed) {
      // A fixed commission is the same amount for every student. The rate kept with it is the
      // equivalent percentage of this student's tuition, so everything that reads a rate keeps working.
      const fixed = parseFloat(university.commissionFixedAmount);
      if (fixed > 0) {
        gross = round2(fixed);
        rate = tuition > 0 ? Math.min(999.99, Math.max(0.01, round2((gross / tuition) * 100))) : 0.01;
      } else {
        rate = null;
      }
    } else if (rate > 0) {
      gross = round2(tuition * (rate / 100));
    }
    if (!(rate > 0)) missing.add(university ? university.name : 'Unknown university');
    total += gross;
    tuitionTotal += tuition;
    return {
      applicationId: app.id,
      applicationNumber: app.applicationNumber || null,
      universityId: app.universityId,
      universityName: university ? university.name : null,
      tuition,
      rate: rate > 0 ? rate : null,
      gross
    };
  });

  total = round2(total);
  return {
    lines,
    total,
    tuitionTotal: round2(tuitionTotal),
    blendedRate: tuitionTotal > 0 ? round2((total / tuitionTotal) * 100) : 0,
    missing: [...missing]
  };
};

// Throws a 400 naming the universities that have no commission rate, so the admin knows what to set.
const assertRatesSet = (commission) => {
  if (commission.missing.length) {
    const err = new Error(
      `Commission rate is not set for: ${commission.missing.join(', ')}. The Head of Admission must set it on the university first.`
    );
    err.statusCode = 400;
    throw err;
  }
};

module.exports = { parseCommissionRate, parseFixedAmount, computeCommission, assertRatesSet, round2 };
