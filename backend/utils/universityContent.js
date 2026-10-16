const { randomUUID: uuidv4 } = require('crypto');

// Validation for the university information the Head of Admission maintains.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value) => typeof value === 'string' && UUID.test(value);

const MAX_FEES = 20;

const fail = (message) => {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
};

/**
 * Fee structure: a list of named fees, for example Application fee, Registration fee, Insurance.
 * [{ id, label, amount, currency, note }]
 * Returns a clean list (ids are kept or created) or throws a 400 naming the problem.
 */
const parseFees = (raw) => {
  if (raw === undefined || raw === null || raw === '') return [];
  if (!Array.isArray(raw)) throw fail('Fees must be a list');
  if (raw.length > MAX_FEES) throw fail(`A university can have at most ${MAX_FEES} fees`);

  return raw.map((item, index) => {
    const row = `Fee ${index + 1}`;
    const label = typeof item.label === 'string' ? item.label.trim() : '';
    if (!label) throw fail(`${row}: a name is required`);
    if (label.length > 100) throw fail(`${row}: the name must be at most 100 characters`);

    const amount = parseFloat(item.amount);
    if (isNaN(amount) || !isFinite(amount) || amount < 0) throw fail(`${row} (${label}): the amount must be a number, 0 or more`);

    const currency = String(item.currency || 'USD').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw fail(`${row} (${label}): the currency must be a 3-letter code such as USD or MYR`);

    const note = typeof item.note === 'string' ? item.note.trim() : '';
    if (note.length > 255) throw fail(`${row} (${label}): the note must be at most 255 characters`);

    return {
      id: isUuid(item.id) ? item.id : uuidv4(),
      label,
      amount: Math.round(amount * 100) / 100,
      currency,
      note: note || null
    };
  });
};

module.exports = { isUuid, parseFees, MAX_FEES, fail };
