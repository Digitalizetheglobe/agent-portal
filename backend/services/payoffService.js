const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { Payoff, Invoice, User, Application, Student, University, CommissionSnapshot } = require('../models');
const { scopeWhereToAgents, assertCanAccessAgent } = require('../utils/agentScope');
const { putObject, getObject, generateStoragePath } = require('../utils/storage');
const { createNotification } = require('../controllers/notificationController');
const { randomUUID: uuidv4 } = require('crypto');

const ALLOWED_PAYOFF_STATUSES = ['PENDING', 'SETTLED', 'CANCELLED'];

const fail = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const addHistory = (payoff, user, action, notes) => {
  const history = Array.isArray(payoff.history) ? [...payoff.history] : [];
  history.push({ action, by: user.id, byName: user.name, at: new Date().toISOString(), notes: notes || null });
  payoff.history = history;
};

// Helper to generate collision-safe unique payoff number
const generatePayoffNumber = async (transaction = null) => {
  const year = new Date().getFullYear();
  let attempts = 0;
  while (attempts < 10) {
    const random = Math.floor(10000 + Math.random() * 90000);
    const payoffNumber = `PO-${year}-${random}`;
    const exists = await Payoff.findOne({ where: { payoffNumber }, transaction });
    if (!exists) {
      return payoffNumber;
    }
    attempts++;
  }
  // Fallback with timestamp
  return `PO-${year}-${Date.now().toString().slice(-6)}`;
};

class PayoffService {
  /**
   * Automatically generate exactly one Payoff for an approved Invoice.
   * Executed within an atomic transaction alongside invoice approval and snapshots.
   */
  async createPayoffForApprovedInvoice(invoice, grossCommission, currentUser, transaction = null, currency = null) {
    // 1. Idempotency guard: If Payoff already exists for this invoice, return it
    const existing = await Payoff.findOne({
      where: { invoiceId: invoice.id },
      transaction
    });

    if (existing) {
      return existing;
    }

    const payoffNumber = await generatePayoffNumber(transaction);
    const gross = parseFloat(grossCommission) || 0;
    const deductions = 0.00;
    const net = Math.round((gross - deductions) * 100) / 100;

    const payoff = await Payoff.create({
      payoffNumber,
      agentId: invoice.agentId,
      invoiceId: invoice.id,
      grossCommission: gross,
      deductions,
      netAmount: net,
      // The payoff is in the currency of the applications; the university payment must match it
      currency: currency || invoice.currency || 'USD',
      status: 'PENDING'
    }, { transaction });

    return payoff;
  }

  /**
   * List payoffs with pagination, filtering by status, search, and strict agent isolation.
   */
  async getPayoffs(query = {}, currentUser) {
    const {
      page = 1,
      limit = 20,
      status,
      agentId,
      search
    } = query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (parsedPage - 1) * parsedLimit;

    const where = {};

    // 1. Strict Agent Isolation
    if (currentUser.role === 'agent') {
      where.agentId = currentUser.id;
    } else if (agentId) {
      where.agentId = agentId;
    }
    // Account Managers only see payoffs of their own agents
    await scopeWhereToAgents(where, currentUser);

    // 2. Status Filter
    if (status) {
      const upperStatus = status.toUpperCase();
      if (!ALLOWED_PAYOFF_STATUSES.includes(upperStatus)) {
        const err = new Error(`Invalid status filter. Allowed: ${ALLOWED_PAYOFF_STATUSES.join(', ')}`);
        err.statusCode = 400;
        throw err;
      }
      where.status = upperStatus;
    }

    // 3. Search Filter
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { payoffNumber: { [Op.iLike]: term } },
        { settlementReference: { [Op.iLike]: term } },
        { batchReference: { [Op.iLike]: term } }
      ];
    }

    const { count, rows } = await Payoff.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email', 'agencyName']
        },
        {
          model: Invoice,
          as: 'invoice',
          attributes: ['id', 'invoiceNumber', 'amount', 'commissionRate', 'status', 'financeReviewStatus']
        },
        {
          model: User,
          as: 'settler',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parsedLimit,
      offset,
      distinct: true
    });

    const totalPages = Math.ceil(count / parsedLimit) || 1;

    return {
      total: count,
      page: parsedPage,
      limit: parsedLimit,
      totalPages,
      payoffs: rows.map(p => p.toJSON()),
      pagination: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        totalPages
      }
    };
  }

  /**
   * Get single Payoff by ID with detailed snapshots.
   */
  async getPayoffById(id, currentUser) {
    const payoff = await Payoff.findByPk(id, {
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email', 'agencyName', 'phone']
        },
        {
          model: Invoice,
          as: 'invoice',
          include: [
            {
              model: CommissionSnapshot,
              as: 'commissionSnapshots',
              include: [
                {
                  model: Application,
                  as: 'application',
                  attributes: ['id', 'applicationNumber', 'courseName', 'courseLevel', 'status'],
                  include: [
                    { model: Student, as: 'student', attributes: ['id', 'name', 'email'] },
                    { model: University, as: 'university', attributes: ['id', 'name', 'code'] }
                  ]
                }
              ]
            }
          ]
        },
        {
          model: User,
          as: 'settler',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!payoff) {
      const err = new Error('Payoff not found');
      err.statusCode = 404;
      throw err;
    }

    // Agent ownership check
    if (currentUser.role === 'agent' && payoff.agentId.toString() !== currentUser.id.toString()) {
      const err = new Error('Access denied. You do not own this payoff.');
      err.statusCode = 403;
      throw err;
    }
    await assertCanAccessAgent(currentUser, payoff.agentId);

    return payoff.toJSON();
  }

  /**
   * Who may record that the university paid QStudy: Accounts or the Head of Admission (or super admin).
   */
  _requireUniversityPaymentRole(currentUser) {
    const allowed = currentUser.role === 'admin' &&
      (!currentUser.staffRole || ['accounts', 'head_admission'].includes(currentUser.staffRole));
    if (!allowed) throw fail(403, 'Only Accounts or the Head of Admission can record the university payment.');
  }

  async _notifyStaff(staffRoles, excludeId, { title, message, relatedId }) {
    const staff = await User.findAll({
      where: { role: 'admin', status: 'active', staffRole: staffRoles },
      attributes: ['id']
    });
    await Promise.all(staff.filter(s => s.id !== excludeId).map(s => createNotification({
      recipient: s.id,
      title,
      message,
      type: 'info',
      relatedId,
      relatedModel: 'Payoff'
    })));
  }

  /**
   * Record that the university has paid QStudy. This unlocks paying the agent. The payment is in the
   * payoff's currency, so USD stays USD and RM stays RM.
   */
  async recordUniversityPayment(id, data = {}, currentUser) {
    this._requireUniversityPaymentRole(currentUser);

    const amount = parseFloat(data.amount);
    if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
      throw fail(400, 'The amount the university paid must be greater than 0.');
    }
    const reference = typeof data.reference === 'string' ? data.reference.trim() : '';
    if (!reference) throw fail(400, 'A payment reference is required.');

    let receivedAt = new Date();
    if (data.receivedAt) {
      receivedAt = new Date(data.receivedAt);
      if (isNaN(receivedAt.getTime())) throw fail(400, 'The date the payment was received is not valid.');
      if (receivedAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
        throw fail(400, 'The date the payment was received cannot be in the future.');
      }
    }

    const payoff = await Payoff.findByPk(id);
    if (!payoff) throw fail(404, 'Payoff not found');
    if (payoff.status !== 'PENDING') throw fail(400, `A ${payoff.status.toLowerCase()} payoff cannot take a university payment.`);

    // The currency of the university payment is the payoff's currency
    if (data.currency && String(data.currency).toUpperCase() !== String(payoff.currency).toUpperCase()) {
      throw fail(400, `This payoff is in ${payoff.currency}, so the university payment must be recorded in ${payoff.currency}. ` +
        'If the university paid in another currency, correct the currency on the applications first.');
    }

    const firstTime = !payoff.universityPaidAt;
    payoff.universityPaidAmount = Math.round(amount * 100) / 100;
    payoff.universityPaidAt = receivedAt;
    payoff.universityPaymentReference = reference;
    payoff.universityPaymentNotes = typeof data.notes === 'string' && data.notes.trim() ? data.notes.trim() : null;
    payoff.universityPaymentRecordedBy = currentUser.id;
    payoff.universityPaymentRecordedAt = new Date();
    addHistory(payoff, currentUser, firstTime ? 'UNIVERSITY_PAYMENT_RECORDED' : 'UNIVERSITY_PAYMENT_UPDATED',
      `${payoff.currency} ${payoff.universityPaidAmount.toFixed(2)} received. Ref: ${reference}`);
    await payoff.save();

    if (firstTime) {
      await this._notifyStaff(['accounts', 'head_admission'], currentUser.id, {
        title: 'University payment recorded',
        message: `The university paid QStudy for payoff ${payoff.payoffNumber}. The agent can now be paid.`,
        relatedId: payoff.id
      });
    }

    return await this.getPayoffById(payoff.id, currentUser);
  }

  /**
   * Head of Admission (or super admin): allow the agent to be paid before the university has paid,
   * with a note. Accounts can then settle the payoff.
   */
  async authorizeBypass(id, { note } = {}, currentUser) {
    const allowed = currentUser.role === 'admin' && (!currentUser.staffRole || currentUser.staffRole === 'head_admission');
    if (!allowed) throw fail(403, 'Only the Head of Admission can allow payment before the university has paid.');

    const reason = typeof note === 'string' ? note.trim() : '';
    if (!reason) throw fail(400, 'A note explaining the exception is required.');

    const payoff = await Payoff.findByPk(id);
    if (!payoff) throw fail(404, 'Payoff not found');
    if (payoff.status !== 'PENDING') throw fail(400, `A ${payoff.status.toLowerCase()} payoff cannot be changed.`);
    if (payoff.universityPaidAt) throw fail(400, 'The university payment is already recorded, so no exception is needed.');
    if (payoff.blockBypassedAt) throw fail(400, 'An exception has already been authorized for this payoff.');

    payoff.blockBypassedBy = currentUser.id;
    payoff.blockBypassedAt = new Date();
    payoff.blockBypassNote = reason;
    addHistory(payoff, currentUser, 'UNIVERSITY_PAYMENT_BYPASSED', reason);
    await payoff.save();

    await this._notifyStaff(['accounts'], currentUser.id, {
      title: 'Payment exception authorized',
      message: `${currentUser.name} allowed payoff ${payoff.payoffNumber} to be paid before the university has paid. Reason: ${reason}`,
      relatedId: payoff.id
    });

    return await this.getPayoffById(payoff.id, currentUser);
  }

  /**
   * The payment slip, for the agent who owns the payoff and for staff.
   */
  async getSlipFile(id, currentUser) {
    const payoff = await Payoff.findByPk(id);
    if (!payoff) throw fail(404, 'Payoff not found');
    if (currentUser.role === 'agent' && payoff.agentId.toString() !== currentUser.id.toString()) {
      throw fail(403, 'Access denied. You do not own this payoff.');
    }
    await assertCanAccessAgent(currentUser, payoff.agentId);
    const slip = payoff.paymentSlip;
    if (!slip || !slip.fileUrl) throw fail(404, 'No payment slip has been uploaded.');
    const { data, contentType } = await getObject(slip.fileUrl);
    return { data, contentType: contentType || slip.contentType, fileName: slip.fileName };
  }

  /**
   * Admin settles a pending payoff (human-confirmed offline settlement recording).
   */
  async settlePayoff(id, data, currentUser, slipFile = null) {
    if (currentUser.role !== 'admin') {
      const err = new Error('Access denied. Only admin can record payoff settlement.');
      err.statusCode = 403;
      throw err;
    }

    const {
      settlementReference,
      settledAt,
      settlementNotes,
      batchReference
    } = data;

    if (!settlementReference || typeof settlementReference !== 'string' || !settlementReference.trim()) {
      const err = new Error('Settlement reference / UTR is required');
      err.statusCode = 400;
      throw err;
    }
    if (!slipFile) throw fail(400, 'Please upload the payment slip.');

    let parsedSettledAt = new Date();
    if (settledAt) {
      const d = new Date(settledAt);
      if (isNaN(d.getTime())) {
        const err = new Error('Invalid settledAt date format');
        err.statusCode = 400;
        throw err;
      }
      parsedSettledAt = d;
    }

    const t = await sequelize.transaction();
    try {
      const payoff = await Payoff.findByPk(id, {
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (!payoff) {
        const err = new Error('Payoff not found');
        err.statusCode = 404;
        throw err;
      }

      // Terminal state check
      if (payoff.status === 'SETTLED') {
        const err = new Error('Payoff is already settled and cannot be modified');
        err.statusCode = 400;
        throw err;
      }

      if (payoff.status === 'CANCELLED') {
        const err = new Error('Cannot settle a cancelled payoff');
        err.statusCode = 400;
        throw err;
      }

      if (payoff.status !== 'PENDING') {
        const err = new Error(`Invalid payoff transition from ${payoff.status} to SETTLED`);
        err.statusCode = 400;
        throw err;
      }

      // The agent is paid only after the university has paid QStudy (or the Head of Admission allowed an exception)
      if (!payoff.universityPaidAt && !payoff.blockBypassedAt) {
        throw fail(400, 'The university has not paid QStudy yet. Record the university payment first. ' +
          'If the agent must be paid earlier, the Head of Admission can authorize an exception.');
      }

      const slipPath = generateStoragePath(`payoffs/${payoff.id}/slip`, slipFile.originalname);
      const slipResult = await putObject(slipPath, slipFile.buffer, slipFile.mimetype);
      payoff.paymentSlip = {
        id: uuidv4(),
        fileUrl: slipResult.path,
        fileName: slipFile.originalname,
        contentType: slipFile.mimetype,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser.id
      };

      payoff.status = 'SETTLED';
      payoff.settlementReference = settlementReference.trim();
      payoff.settledAt = parsedSettledAt;
      payoff.settledBy = currentUser.id;
      if (settlementNotes !== undefined) payoff.settlementNotes = settlementNotes ? settlementNotes.trim() : null;
      if (batchReference !== undefined) payoff.batchReference = batchReference ? batchReference.trim() : null;

      addHistory(payoff, currentUser, 'PAYOFF_SETTLED',
        `${payoff.currency} ${Number(payoff.netAmount).toFixed(2)} paid. Ref: ${payoff.settlementReference}`);
      await payoff.save({ transaction: t });

      // Legacy compatibility sync: Mark associated Invoice as Paid
      const invoice = await Invoice.findByPk(payoff.invoiceId, { transaction: t });
      if (invoice && invoice.status !== 'Paid') {
        invoice.status = 'Paid';
        invoice.paidAt = parsedSettledAt;
        const settlementPrefix = `[Settled via Payoff ${payoff.payoffNumber} | Ref: ${payoff.settlementReference}]`;
        invoice.remarks = invoice.remarks ? `${settlementPrefix} ${invoice.remarks}` : settlementPrefix;
        await invoice.save({ transaction: t });
      }

      await t.commit();

      await createNotification({
        recipient: payoff.agentId,
        title: 'Payment cleared',
        message: `Your commission payment of ${payoff.currency} ${Number(payoff.netAmount).toFixed(2)} (${payoff.payoffNumber}) has been paid.`,
        type: 'success',
        relatedId: payoff.id,
        relatedModel: 'Payoff'
      });

      return await this.getPayoffById(payoff.id, currentUser);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Admin cancels a pending payoff.
   */
  async cancelPayoff(id, { reason }, currentUser) {
    if (currentUser.role !== 'admin') {
      const err = new Error('Access denied. Only admin can cancel a payoff.');
      err.statusCode = 403;
      throw err;
    }

    const t = await sequelize.transaction();
    try {
      const payoff = await Payoff.findByPk(id, {
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (!payoff) {
        const err = new Error('Payoff not found');
        err.statusCode = 404;
        throw err;
      }

      // Terminal state check
      if (payoff.status === 'SETTLED') {
        const err = new Error('Cannot cancel an already settled payoff');
        err.statusCode = 400;
        throw err;
      }

      if (payoff.status === 'CANCELLED') {
        const err = new Error('Payoff is already cancelled');
        err.statusCode = 400;
        throw err;
      }

      if (payoff.status !== 'PENDING') {
        const err = new Error(`Invalid payoff transition from ${payoff.status} to CANCELLED`);
        err.statusCode = 400;
        throw err;
      }

      payoff.status = 'CANCELLED';
      if (reason && reason.trim()) {
        payoff.settlementNotes = payoff.settlementNotes
          ? `${payoff.settlementNotes} | Cancellation reason: ${reason.trim()}`
          : `Cancellation reason: ${reason.trim()}`;
      }

      await payoff.save({ transaction: t });
      await t.commit();

      return await this.getPayoffById(payoff.id, currentUser);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

module.exports = new PayoffService();
