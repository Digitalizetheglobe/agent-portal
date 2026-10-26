const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { Payoff, Invoice, Application, Student, University, UniversityPayment, User } = require('../models');
const { createNotification } = require('../controllers/notificationController');
const { isUuid } = require('../utils/universityContent');

// What each university owes QStudy, and the payments that bring it down.
// An invoice holds one university and one currency (see invoiceService), so every payoff belongs to
// exactly one university. A university payment is spread over that university's payoffs, oldest first.
// A payoff counts as "university paid" once payments cover its whole commission; that unlocks paying the agent.
// All of this is staff only: nothing here is ever sent to an agent.

const PAYMENT_TERM_OPTIONS = [0, 14, 30];
const DEFAULT_PAYMENT_TERM_DAYS = 14;
const EPS = 0.005;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const fail = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const addDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

// Accounts, Head of Admission and super admin work with university money
const isFinanceStaff = (user) =>
  user?.role === 'admin' && (!user.staffRole || ['accounts', 'head_admission'].includes(user.staffRole));

const requireFinanceStaff = (user) => {
  if (!isFinanceStaff(user)) throw fail(403, 'Only Accounts or the Head of Admission can work with university payments.');
};

const groupKey = (universityId, currency) => `${universityId}|${currency}`;

// Every live payoff with the university, students and programmes behind it
const loadPayoffs = async ({ transaction } = {}) => Payoff.findAll({
  where: { status: { [Op.ne]: 'CANCELLED' } },
  include: [
    { model: User, as: 'agent', attributes: ['id', 'name', 'agencyName'] },
    {
      model: Invoice,
      as: 'invoice',
      attributes: ['id', 'invoiceNumber', 'financeReviewedAt'],
      include: [{
        model: Application,
        as: 'applications',
        attributes: ['id', 'universityId', 'studentId', 'courseName', 'tuitionFee', 'currency'],
        include: [{ model: Student, as: 'student', attributes: ['id', 'name'] }]
      }]
    }
  ],
  order: [['createdAt', 'ASC']],
  transaction
});

const activePayments = async ({ transaction } = {}) =>
  UniversityPayment.findAll({ where: { status: 'ACTIVE' }, order: [['receivedAt', 'ASC'], ['createdAt', 'ASC']], transaction });

// payoffId -> amount received so far
const receivedByPayoff = (payments) => {
  const map = new Map();
  payments.forEach((p) => (p.allocations || []).forEach((a) => {
    map.set(String(a.payoffId), round2((map.get(String(a.payoffId)) || 0) + Number(a.amount)));
  }));
  return map;
};

// One row per payoff with what it is worth, what has been received, and which university it belongs to
const buildLines = (payoffs, received) => payoffs
  .map((payoff) => {
    const apps = payoff.invoice?.applications || [];
    const universityId = apps[0]?.universityId ? String(apps[0].universityId) : null;
    if (!universityId) return null;
    const gross = round2(payoff.grossCommission);
    const got = Math.min(round2(received.get(String(payoff.id)) || 0), gross);
    return {
      universityId,
      currency: String(payoff.currency || 'USD').toUpperCase(),
      payoffId: payoff.id,
      payoffNumber: payoff.payoffNumber,
      invoiceNumber: payoff.invoice?.invoiceNumber || null,
      status: payoff.status,
      agent: payoff.agent ? { id: payoff.agent.id, name: payoff.agent.name, agencyName: payoff.agent.agencyName } : null,
      gross,
      received: got,
      outstanding: round2(gross - got),
      exceptionAuthorized: Boolean(payoff.blockBypassedAt),
      approvedAt: payoff.invoice?.financeReviewedAt || payoff.createdAt,
      students: apps.map((a) => ({
        id: a.studentId,
        name: a.student?.name || 'Student',
        programme: a.courseName || null,
        tuition: round2(a.tuitionFee)
      }))
    };
  })
  .filter(Boolean);

const addHistory = (payoff, user, action, notes) => {
  const history = Array.isArray(payoff.history) ? [...payoff.history] : [];
  history.push({ action, by: user.id, byName: user.name, at: new Date().toISOString(), notes: notes || null });
  payoff.history = history;
};

const notifyFinance = async (excludeId, { title, message, relatedId }) => {
  const staff = await User.findAll({
    where: { role: 'admin', status: 'active', staffRole: ['accounts', 'head_admission'] },
    attributes: ['id']
  });
  await Promise.all(staff.filter((s) => s.id !== excludeId).map((s) => createNotification({
    recipient: s.id,
    title,
    message,
    type: 'info',
    relatedId,
    relatedModel: 'Payoff'
  })));
};

class UniversityReceivableService {
  /**
   * What every university owes QStudy, grouped by university and the currency it pays in.
   */
  async getReceivables(currentUser) {
    requireFinanceStaff(currentUser);

    const [payoffs, payments] = await Promise.all([loadPayoffs(), activePayments()]);
    const lines = buildLines(payoffs, receivedByPayoff(payments));

    const groups = new Map();
    lines.forEach((line) => {
      const key = groupKey(line.universityId, line.currency);
      if (!groups.has(key)) {
        groups.set(key, {
          universityId: line.universityId,
          currency: line.currency,
          payoffs: [],
          students: new Set(),
          programmeTotal: 0,
          commissionTotal: 0,
          received: 0
        });
      }
      const g = groups.get(key);
      g.payoffs.push(line);
      line.students.forEach((s) => g.students.add(String(s.id)));
      g.programmeTotal += line.students.reduce((sum, s) => sum + s.tuition, 0);
      g.commissionTotal += line.gross;
      g.received += line.received;
    });

    const universityIds = [...new Set([...groups.values()].map((g) => g.universityId))];
    const universities = universityIds.length
      ? await University.findAll({ where: { id: { [Op.in]: universityIds } }, attributes: ['id', 'name', 'country', 'logoUrl'] })
      : [];
    const uniById = new Map(universities.map((u) => [String(u.id), u]));

    const allPayments = universityIds.length
      ? await UniversityPayment.findAll({ where: { universityId: { [Op.in]: universityIds } }, order: [['receivedAt', 'DESC'], ['createdAt', 'DESC']] })
      : [];

    const result = [...groups.values()].map((g) => {
      const commissionTotal = round2(g.commissionTotal);
      const received = round2(g.received);
      const balance = round2(commissionTotal - received);
      const waiting = g.payoffs.filter((p) => p.outstanding > EPS).map((p) => new Date(p.approvedAt).getTime());
      const uni = uniById.get(g.universityId);
      return {
        universityId: g.universityId,
        universityName: uni?.name || 'Unknown university',
        country: uni?.country || null,
        logoUrl: uni?.logoUrl || null,
        currency: g.currency,
        studentCount: g.students.size,
        payoffCount: g.payoffs.length,
        programmeTotal: round2(g.programmeTotal),
        commissionTotal,
        received,
        balance,
        done: balance <= EPS,
        waitingSince: waiting.length ? new Date(Math.min(...waiting)).toISOString() : null,
        payoffs: g.payoffs.sort((a, b) => new Date(a.approvedAt) - new Date(b.approvedAt)),
        payments: allPayments
          .filter((p) => String(p.universityId) === g.universityId && p.currency === g.currency)
          .map((p) => p.toJSON())
      };
    });

    // Universities still owing money first (the longest wait on top), finished ones last
    result.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (new Date(a.waitingSince || 0)) - (new Date(b.waitingSince || 0)) || a.universityName.localeCompare(b.universityName);
    });
    return { universities: result };
  }

  /**
   * Record a university payment. It is spread over the university's payoffs in that currency, oldest
   * first (or only over the payoffs chosen). It cannot be more than what is still owed.
   */
  async recordPayment(data = {}, currentUser) {
    requireFinanceStaff(currentUser);

    if (!isUuid(data.universityId)) throw fail(400, 'Choose the university that paid.');
    const currency = String(data.currency || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw fail(400, 'The currency must be a 3-letter code such as USD, INR or MYR.');

    const amount = round2(data.amount);
    if (!(amount > 0)) throw fail(400, 'The amount the university paid must be greater than 0.');

    const reference = typeof data.reference === 'string' ? data.reference.trim() : '';
    if (!reference) throw fail(400, 'A payment reference is required.');
    if (reference.length > 100) throw fail(400, 'The payment reference must be at most 100 characters.');

    let receivedAt = todayStr();
    if (data.receivedAt) {
      const parsed = new Date(data.receivedAt);
      if (isNaN(parsed.getTime())) throw fail(400, 'The date the payment was received is not valid.');
      receivedAt = parsed.toISOString().slice(0, 10);
      if (receivedAt > addDays(todayStr(), 1)) throw fail(400, 'The date the payment was received cannot be in the future.');
    }

    let termDays = DEFAULT_PAYMENT_TERM_DAYS;
    if (data.paymentTermDays !== undefined && data.paymentTermDays !== null && data.paymentTermDays !== '') {
      termDays = Number(data.paymentTermDays);
      if (!PAYMENT_TERM_OPTIONS.includes(termDays)) {
        throw fail(400, `The payment term must be one of: ${PAYMENT_TERM_OPTIONS.join(', ')} days.`);
      }
    }
    const chosen = Array.isArray(data.payoffIds) && data.payoffIds.length ? new Set(data.payoffIds.map(String)) : null;
    const notes = typeof data.notes === 'string' && data.notes.trim() ? data.notes.trim() : null;

    const t = await sequelize.transaction();
    try {
      // One recording at a time per university, so two payments cannot both use the same balance
      const university = await University.findByPk(data.universityId, { lock: t.LOCK.UPDATE, transaction: t });
      if (!university) throw fail(404, 'University not found');

      const [payoffs, payments] = await Promise.all([loadPayoffs({ transaction: t }), activePayments({ transaction: t })]);
      const lines = buildLines(payoffs, receivedByPayoff(payments))
        .filter((l) => l.universityId === String(university.id) && l.currency === currency && l.outstanding > EPS);

      if (lines.length === 0) {
        throw fail(400, `${university.name} owes nothing in ${currency} right now, so there is no balance to record a payment against.`);
      }
      const candidates = (chosen ? lines.filter((l) => chosen.has(String(l.payoffId))) : lines)
        .sort((a, b) => new Date(a.approvedAt) - new Date(b.approvedAt));
      if (candidates.length === 0) throw fail(400, 'None of the chosen payoffs has a balance for this university.');

      const owed = round2(candidates.reduce((sum, l) => sum + l.outstanding, 0));
      if (amount > owed + EPS) {
        throw fail(400, `${university.name} owes ${currency} ${owed.toFixed(2)} on ${chosen ? 'the chosen payoffs' : 'its payoffs'}, ` +
          `so ${currency} ${amount.toFixed(2)} is too much. Check the amount and the currency.`);
      }

      let left = amount;
      const allocations = [];
      for (const line of candidates) {
        if (left <= EPS) break;
        const part = round2(Math.min(left, line.outstanding));
        allocations.push({ payoffId: line.payoffId, amount: part });
        left = round2(left - part);
      }

      const payment = await UniversityPayment.create({
        universityId: university.id,
        currency,
        amount,
        receivedAt,
        reference,
        notes,
        paymentTermDays: termDays,
        recordedBy: currentUser.id,
        recordedByName: currentUser.name,
        allocations
      }, { transaction: t });

      await this._refreshPayoffs(allocations.map((a) => a.payoffId), currentUser, t);
      await t.commit();
      return { payment: payment.toJSON(), ...(await this.getReceivables(currentUser)) };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Reverse a wrong payment. It stays in the history with the reason; the balance is restored.
   * A payment cannot be reversed once an agent was already paid from it.
   */
  async reversePayment(id, { reason } = {}, currentUser) {
    requireFinanceStaff(currentUser);
    const why = typeof reason === 'string' ? reason.trim() : '';
    if (!why) throw fail(400, 'A reason for the reversal is required.');

    const t = await sequelize.transaction();
    try {
      const existing = await UniversityPayment.findByPk(id, { transaction: t });
      if (!existing) throw fail(404, 'University payment not found');
      await University.findByPk(existing.universityId, { lock: t.LOCK.UPDATE, transaction: t });

      const payment = await UniversityPayment.findByPk(id, { lock: t.LOCK.UPDATE, transaction: t });
      if (payment.status !== 'ACTIVE') throw fail(400, 'This payment was already reversed.');

      const payoffIds = (payment.allocations || []).map((a) => a.payoffId);
      const settled = await Payoff.count({ where: { id: { [Op.in]: payoffIds }, status: 'SETTLED' }, transaction: t });
      if (settled > 0) {
        throw fail(400, 'An agent was already paid from this payment, so it cannot be reversed.');
      }

      payment.status = 'REVERSED';
      payment.reversedAt = new Date();
      payment.reversedBy = currentUser.id;
      payment.reversalReason = why;
      await payment.save({ transaction: t });

      await this._refreshPayoffs(payoffIds, currentUser, t, `Reversed university payment ${payment.reference}: ${why}`);
      await t.commit();
      return await this.getReceivables(currentUser);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Bring each payoff's "university paid" fields in line with the payments that cover it.
   * Fully covered: it is university paid, and the agent's due date starts. Not covered (after a
   * reversal): back to waiting for the university.
   */
  async _refreshPayoffs(payoffIds, user, transaction, reversalNote) {
    const ids = [...new Set(payoffIds.map(String))];
    if (ids.length === 0) return;

    const payments = await activePayments({ transaction });
    const received = receivedByPayoff(payments);

    for (const id of ids) {
      const payoff = await Payoff.findByPk(id, { transaction });
      if (!payoff || payoff.status === 'CANCELLED') continue;

      const gross = round2(payoff.grossCommission);
      const got = round2(received.get(String(id)) || 0);
      const covering = payments.filter((p) => (p.allocations || []).some((a) => String(a.payoffId) === String(id)));

      if (got + EPS >= gross && covering.length > 0) {
        const latest = covering[covering.length - 1];
        const wasPaid = Boolean(payoff.universityPaidAt);
        const references = [...new Set(covering.map((p) => p.reference))].join(', ').slice(0, 100);
        payoff.universityPaidAmount = got;
        payoff.universityPaidAt = new Date(`${latest.receivedAt}T00:00:00Z`);
        payoff.universityPaymentReference = references;
        payoff.universityPaymentNotes = latest.notes || null;
        payoff.universityPaymentRecordedBy = latest.recordedBy;
        payoff.universityPaymentRecordedAt = new Date();
        payoff.paymentTermDays = latest.paymentTermDays;
        payoff.payoutDueDate = addDays(latest.receivedAt, latest.paymentTermDays);
        addHistory(payoff, user, wasPaid ? 'UNIVERSITY_PAYMENT_UPDATED' : 'UNIVERSITY_PAYMENT_RECORDED',
          `${payoff.currency} ${got.toFixed(2)} received from the university. Ref: ${references}`);
        await payoff.save({ transaction });

        if (!wasPaid) {
          await notifyFinance(user.id, {
            title: 'University payment recorded',
            message: `The university has paid for payoff ${payoff.payoffNumber}. The agent can now be paid.`,
            relatedId: payoff.id
          });
        }
      } else if (payoff.universityPaidAt && payoff.status === 'PENDING') {
        payoff.universityPaidAmount = null;
        payoff.universityPaidAt = null;
        payoff.universityPaymentReference = null;
        payoff.universityPaymentNotes = null;
        payoff.universityPaymentRecordedBy = null;
        payoff.universityPaymentRecordedAt = null;
        payoff.paymentTermDays = null;
        payoff.payoutDueDate = null;
        addHistory(payoff, user, 'UNIVERSITY_PAYMENT_REVERSED', reversalNote || 'University payment no longer covers this payoff');
        await payoff.save({ transaction });
      }
    }
  }

  /**
   * One-time carry-over: a payment recorded the old way on a single payoff becomes a university
   * payment that fully covers that payoff, so nothing already recorded is lost. Safe to run on every start.
   */
  async migrateLegacyPayments() {
    const payoffs = await Payoff.findAll({
      where: { universityPaidAt: { [Op.ne]: null }, status: { [Op.ne]: 'CANCELLED' } },
      include: [{ model: Invoice, as: 'invoice', attributes: ['id'], include: [{ model: Application, as: 'applications', attributes: ['id', 'universityId'] }] }]
    });
    if (payoffs.length === 0) return 0;

    const [payments, anyAdmin] = await Promise.all([
      UniversityPayment.findAll({ attributes: ['id', 'allocations', 'legacyPayoffId'] }),
      User.findOne({ where: { role: 'admin' }, attributes: ['id', 'name'], order: [['createdAt', 'ASC']] })
    ]);
    const covered = new Set();
    payments.forEach((p) => (p.allocations || []).forEach((a) => covered.add(String(a.payoffId))));

    let created = 0;
    for (const payoff of payoffs) {
      if (covered.has(String(payoff.id))) continue;
      const universityId = payoff.invoice?.applications?.[0]?.universityId;
      const recordedBy = payoff.universityPaymentRecordedBy || payoff.settledBy || anyAdmin?.id;
      if (!universityId || !recordedBy) continue;

      const gross = round2(payoff.grossCommission);
      const original = payoff.universityPaidAmount !== null && payoff.universityPaidAmount !== undefined
        ? round2(payoff.universityPaidAmount)
        : null;
      await UniversityPayment.create({
        universityId,
        currency: String(payoff.currency || 'USD').toUpperCase(),
        amount: gross,
        receivedAt: new Date(payoff.universityPaidAt).toISOString().slice(0, 10),
        reference: payoff.universityPaymentReference || 'Migrated',
        notes: `Carried over from payoff ${payoff.payoffNumber}.${original !== null && original !== gross ? ` The amount recorded then was ${original.toFixed(2)}.` : ''}`,
        paymentTermDays: payoff.paymentTermDays ?? DEFAULT_PAYMENT_TERM_DAYS,
        recordedBy,
        recordedByName: anyAdmin && String(anyAdmin.id) === String(recordedBy) ? anyAdmin.name : null,
        allocations: [{ payoffId: payoff.id, amount: gross }],
        legacyPayoffId: payoff.id
      });
      created += 1;
    }
    return created;
  }
}

module.exports = new UniversityReceivableService();
module.exports.isFinanceStaff = isFinanceStaff;
