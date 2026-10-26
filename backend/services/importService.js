const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { University, Course } = require('../models');
const courseService = require('./courseService');
const { parseCommissionRate } = require('../utils/commission');

// Bulk import of universities and programs (called "courses" in the code) from a spreadsheet.
// The browser reads the file and sends rows in small batches; each batch is checked here.
// With dryRun nothing is saved: the same checks run so the user sees what would happen.
// A bad row is reported with its spreadsheet row number and skipped; it never blocks the good rows.

const MAX_ROWS_PER_REQUEST = 300;
const ALLOWED_STATUSES = ['active', 'inactive'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The levels the rest of the portal understands (see applicationService)
const LEVELS = ['Undergraduate', 'Postgraduate', 'Diploma', 'Doctorate', 'Certificate'];
const LEVEL_ALIASES = {
  undergraduate: 'Undergraduate', ug: 'Undergraduate', bachelor: 'Undergraduate', bachelors: 'Undergraduate',
  'bachelor s': 'Undergraduate', degree: 'Undergraduate', 'bachelor degree': 'Undergraduate', honours: 'Undergraduate',
  postgraduate: 'Postgraduate', pg: 'Postgraduate', master: 'Postgraduate', masters: 'Postgraduate',
  'master s': 'Postgraduate', mba: 'Postgraduate', 'master degree': 'Postgraduate',
  diploma: 'Diploma', 'advanced diploma': 'Diploma',
  doctorate: 'Doctorate', phd: 'Doctorate', 'ph d': 'Doctorate', doctoral: 'Doctorate', dba: 'Doctorate',
  certificate: 'Certificate', cert: 'Certificate', foundation: 'Certificate', 'foundation programme': 'Certificate',
  'foundation program': 'Certificate', pre: 'Certificate', 'pre university': 'Certificate'
};

const fail = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const text = (value) => (value === undefined || value === null ? '' : String(value).trim());

const normalizeLevel = (raw) => {
  const value = text(raw);
  if (!value) return { value: null };
  const direct = LEVELS.find((l) => l.toLowerCase() === value.toLowerCase());
  if (direct) return { value: direct };
  const key = value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (LEVEL_ALIASES[key]) return { value: LEVEL_ALIASES[key] };
  return { error: `Level "${value}" is not recognised. Use one of: ${LEVELS.join(', ')} (Bachelor, Master, PhD and Foundation are understood too).` };
};

const checkBatch = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) throw fail(400, 'There are no rows to import.');
  if (rows.length > MAX_ROWS_PER_REQUEST) throw fail(400, `Send at most ${MAX_ROWS_PER_REQUEST} rows at a time.`);
};

const emptyResult = () => ({ created: 0, updated: 0, errors: [], openToAll: 0 });

class ImportService {
  /**
   * Universities. A row matches an existing university by code, or by name when it has no code.
   * Blank cells never erase what is already saved.
   */
  async importUniversities(rows, { dryRun = false } = {}) {
    checkBatch(rows);
    const result = emptyResult();

    for (const row of rows) {
      const line = row._row;
      try {
        const name = text(row.name);
        const code = text(row.code);
        if (!name) throw fail(400, 'University name is required.');
        if (name.length > 255) throw fail(400, 'University name is too long.');

        const status = text(row.status).toLowerCase();
        if (status && !ALLOWED_STATUSES.includes(status)) throw fail(400, `Status must be ${ALLOWED_STATUSES.join(' or ')}.`);

        const email = text(row.contactEmail).toLowerCase();
        if (email && !EMAIL.test(email)) throw fail(400, 'The contact email is not a valid email address.');

        const rate = parseCommissionRate(text(row.commissionRate).replace('%', ''));
        if (rate.error) throw fail(400, rate.error);

        // Find the university this row is about
        let existing = null;
        if (code) existing = await University.findOne({ where: { code } });
        if (!existing) {
          existing = await University.findOne({
            where: sequelize.where(sequelize.fn('lower', sequelize.col('name')), name.toLowerCase())
          });
          if (existing && code && existing.code && existing.code !== code) {
            throw fail(409, `"${name}" already exists with code ${existing.code}, not ${code}.`);
          }
        }

        const values = {
          name,
          code: code || undefined,
          country: text(row.country) || undefined,
          city: text(row.city) || undefined,
          website: text(row.website) || undefined,
          logoUrl: text(row.logoUrl) || undefined,
          contactPerson: text(row.contactPerson) || undefined,
          contactEmail: email || undefined,
          description: text(row.description) || undefined,
          status: status || undefined,
          commissionRate: rate.value === null ? undefined : rate.value
        };
        Object.keys(values).forEach((k) => values[k] === undefined && delete values[k]);

        if (!existing) {
          if (!values.country) throw fail(400, 'Country is required for a new university.');
          if (!dryRun) await University.create({ status: 'active', ...values });
          result.created += 1;
        } else {
          if (!dryRun) {
            existing.set(values);
            await existing.save();
          }
          result.updated += 1;
        }
      } catch (error) {
        result.errors.push({ row: line, message: error.message });
      }
    }
    return result;
  }

  /**
   * Programs. Each row names the university (or several, separated by ; or |) by code or by name.
   * An empty university cell means the program is open to all universities.
   * A row matches an existing program with the same name, level, code and universities.
   */
  async importPrograms(rows, { dryRun = false } = {}) {
    checkBatch(rows);
    const result = emptyResult();

    const universities = await University.findAll({ attributes: ['id', 'name', 'code'] });
    const byCode = new Map(universities.filter((u) => u.code).map((u) => [u.code.toLowerCase(), u]));
    const byName = new Map(universities.map((u) => [u.name.toLowerCase(), u]));

    for (const row of rows) {
      const line = row._row;
      try {
        const name = text(row.name);
        if (!name) throw fail(400, 'Program name is required.');
        if (name.length > 200) throw fail(400, 'Program name is too long (200 characters at most).');

        const level = normalizeLevel(row.level);
        if (level.error) throw fail(400, level.error);

        const status = text(row.status).toLowerCase();
        if (status && !ALLOWED_STATUSES.includes(status)) throw fail(400, `Status must be ${ALLOWED_STATUSES.join(' or ')}.`);

        // Which universities offer it
        const universityIds = [];
        const names = text(row.university).split(/[;|]/).map((s) => s.trim()).filter(Boolean);
        for (const token of names) {
          const uni = byCode.get(token.toLowerCase()) || byName.get(token.toLowerCase());
          if (!uni) throw fail(400, `University "${token}" was not found. Import the universities first, then the programs.`);
          if (!universityIds.includes(String(uni.id))) universityIds.push(String(uni.id));
        }

        const extras = [];
        if (text(row.entryRequirements)) extras.push(`Entry requirements: ${text(row.entryRequirements)}`);
        if (text(row.awardingBody)) extras.push(`Awarding body: ${text(row.awardingBody)}`);
        const description = [text(row.description), ...extras].filter(Boolean).join('\n') || undefined;

        const values = {
          code: text(row.code) || undefined,
          department: text(row.department) || undefined,
          duration: text(row.duration) || undefined,
          tuitionFee: text(row.tuitionFee) || undefined,
          description,
          status: status || undefined
        };
        Object.keys(values).forEach((k) => values[k] === undefined && delete values[k]);

        const finalLevel = level.value || 'Undergraduate';
        const code = values.code ? values.code.toUpperCase() : '';

        // Same program already saved? (name + level + code + the same universities)
        const candidates = await Course.findAll({
          where: {
            level: finalLevel,
            [Op.and]: [sequelize.where(sequelize.fn('lower', sequelize.col('name')), name.toLowerCase())]
          }
        });
        const sameSet = (a, b) => a.length === b.length && a.every((id) => b.includes(id));
        const existing = candidates.find((c) => (c.code || '').toUpperCase() === code && sameSet(c.toJSON().universityIds || [], universityIds));

        if (existing) {
          if (!dryRun) await courseService.updateCourse(existing.id, { ...values, level: finalLevel, universityIds });
          result.updated += 1;
        } else {
          if (dryRun) {
            await courseService.assertNoAmbiguousDuplicate({
              name, code: values.code, level: finalLevel, universityIds, status: values.status === 'inactive' ? 'inactive' : 'active'
            });
          } else {
            await courseService.createCourse({ name, ...values, level: finalLevel, universityIds });
          }
          result.created += 1;
          if (universityIds.length === 0) result.openToAll += 1;
        }
      } catch (error) {
        result.errors.push({ row: line, message: error.message });
      }
    }
    return result;
  }
}

module.exports = new ImportService();
