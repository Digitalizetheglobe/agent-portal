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
      attributes: ['id', 'name', 'commissionRate'],
      transaction
    })
    : [];
  const byId = new Map(universities.map(u => [String(u.id), u]));

  const missing = new Set();
  let total = 0;
  let tuitionTotal = 0;

  const lines = applications.map((app) => {
    const university = byId.get(String(app.universityId));
    const rate = university && university.commissionRate !== null && university.commissionRate !== undefined
      ? parseFloat(university.commissionRate)
      : null;
    const tuition = parseFloat(app.tuitionFee) || 0;
    if (!(rate > 0)) missing.add(university ? university.name : 'Unknown university');

    const gross = rate > 0 ? round2(tuition * (rate / 100)) : 0;
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

module.exports = { parseCommissionRate, computeCommission, assertRatesSet, round2 };
