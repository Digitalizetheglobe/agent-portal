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

const PAYMENT_TERM_OPTIONS = [0, 14, 30];
const DEFAULT_PAYMENT_TERM_DAYS = 14;

// Payment term and due date are for staff only; agents never see them
const STAFF_ONLY_FIELDS = ['paymentTermDays', 'payoutDueDate', 'daysUntilDue'];
const serializePayoff = (payoff, viewer) => {
  const json = payoff.toJSON();
  if (viewer?.role === 'agent') STAFF_ONLY_FIELDS.forEach((key) => delete json[key]);
  return json;
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
    // 1. Idempotency guard: If an active (non-cancelled) Payoff already exists for this invoice, return it
    const existing = await Payoff.findOne({
      where: { invoiceId: invoice.id, status: { [Op.ne]: 'CANCELLED' } },
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

    // Staff filter: pending payouts due within N days (overdue ones included)
    const dueWithinDays = parseInt(query.dueWithinDays, 10);
    if (currentUser.role !== 'agent' && Number.isFinite(dueWithinDays) && dueWithinDays >= 0) {
      const limitDate = new Date(Date.now() + dueWithinDays * 86400000).toISOString().slice(0, 10);
      where.status = 'PENDING';
      where.payoutDueDate = { [Op.ne]: null, [Op.lte]: limitDate };
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
          attributes: ['id', 'invoiceNumber', 'amount', 'commissionRate', 'status', 'financeReviewStatus'],
          include: [{
            model: Application,
            as: 'applications',
            attributes: ['id', 'universityId', 'studentId'],
            required: false,
            include: [{ model: University, as: 'university', attributes: ['id', 'name', 'country'] }]
          }]
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
      payoffs: rows.map(p => {
        const json = serializePayoff(p, currentUser);
        const apps = p.invoice?.applications || [];
        json.university = apps[0]?.university ? { id: apps[0].university.id, name: apps[0].university.name, country: apps[0].university.country } : null;
        json.studentCount = new Set(apps.map(a => String(a.studentId))).size;
        return json;
      }),
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

    return serializePayoff(payoff, currentUser);
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
   * University payments are recorded per university, not per payoff: see universityReceivableService.
   */
  async recordUniversityPayment() {
    throw fail(400, 'Record university payments from the Awaiting University Payment tab, per university.');
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
   * Accounts cancels a pending payoff. The cancellation voids the payout record only: the invoice
   * stays approved with its locked commission, and a replacement payoff can be created (see replacePayoff).
   */
  async cancelPayoff(id, data = {}, currentUser) {
    if (currentUser.role !== 'admin') {
      throw fail(403, 'Access denied. Only admin can cancel a payoff.');
    }
    const reason = typeof data.reason === 'string' ? data.reason.trim()
      : (typeof data.notes === 'string' ? data.notes.trim() : '');
    if (!reason) throw fail(400, 'A cancellation reason is required.');

    const t = await sequelize.transaction();
    let payoff;
    try {
      payoff = await Payoff.findByPk(id, { lock: t.LOCK.UPDATE, transaction: t });
      if (!payoff) throw fail(404, 'Payoff not found');

      // Terminal state check
      if (payoff.status === 'SETTLED') throw fail(400, 'Cannot cancel an already settled payoff');
      if (payoff.status === 'CANCELLED') throw fail(400, 'Payoff is already cancelled');
      if (payoff.status !== 'PENDING') throw fail(400, `Invalid payoff transition from ${payoff.status} to CANCELLED`);

      payoff.status = 'CANCELLED';
      payoff.cancelledAt = new Date();
      payoff.cancelledBy = currentUser.id;
      payoff.cancellationReason = reason;
      addHistory(payoff, currentUser, 'PAYOFF_CANCELLED', reason);
      await payoff.save({ transaction: t });
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }

    await createNotification({
      recipient: payoff.agentId,
      title: 'Payment cancelled',
      message: `Payoff ${payoff.payoffNumber} was cancelled: ${reason}. Your approved commission is unchanged and a replacement payment will be created.`,
      type: 'warning',
      relatedId: payoff.id,
      relatedModel: 'Payoff'
    });
    await this._notifyStaff(['head_admission'], currentUser.id, {
      title: 'Payoff cancelled',
      message: `${currentUser.name} cancelled payoff ${payoff.payoffNumber}: ${reason}`,
      relatedId: payoff.id
    });

    return await this.getPayoffById(payoff.id, currentUser);
  }

  /**
   * Accounts creates a replacement for a cancelled payoff. The approved invoice and its commission
   * snapshots are untouched: this only issues a new payout record for the same locked commission.
   * The university payment is not carried over; it is recorded again on the replacement.
   */
  async replacePayoff(id, data = {}, currentUser) {
    if (currentUser.role !== 'admin') {
      throw fail(403, 'Access denied. Only admin can create a replacement payoff.');
    }

    const t = await sequelize.transaction();
    let created;
    try {
      const cancelled = await Payoff.findByPk(id, { lock: t.LOCK.UPDATE, transaction: t });
      if (!cancelled) throw fail(404, 'Payoff not found');
      if (cancelled.status !== 'CANCELLED') throw fail(400, 'Only a cancelled payoff can be replaced.');

      // Locking the invoice serialises two simultaneous replacements
      const invoice = await Invoice.findByPk(cancelled.invoiceId, { lock: t.LOCK.UPDATE, transaction: t });
      if (!invoice) throw fail(404, 'Invoice not found');
      if (invoice.financeReviewStatus !== 'Approved') {
        throw fail(400, 'The invoice is not approved, so it cannot have a payoff.');
      }
      if (invoice.status === 'Paid') throw fail(400, 'The invoice is already paid.');

      const active = await Payoff.findOne({
        where: { invoiceId: invoice.id, status: { [Op.ne]: 'CANCELLED' } },
        transaction: t
      });
      if (active) throw fail(400, `This invoice already has an active payoff (${active.payoffNumber}).`);

      // The amount comes from the locked commission snapshots, never recalculated
      const snapshots = await CommissionSnapshot.findAll({ where: { invoiceId: invoice.id }, transaction: t });
      if (snapshots.length === 0) throw fail(400, 'The invoice has no locked commission snapshots.');
      const gross = Math.round(snapshots.reduce((sum, s) => sum + parseFloat(s.grossAmount), 0) * 100) / 100;
      const deductions = parseFloat(cancelled.deductions) || 0;
      if (Math.abs(gross - parseFloat(cancelled.grossCommission)) > 0.005) {
        throw fail(409, 'The locked commission no longer matches the cancelled payoff. Check the invoice before creating a replacement.');
      }

      const reason = typeof data.reason === 'string' ? data.reason.trim() : '';
      const payoffNumber = await generatePayoffNumber(t);
      created = await Payoff.create({
        payoffNumber,
        agentId: cancelled.agentId,
        invoiceId: invoice.id,
        grossCommission: gross,
        deductions,
        netAmount: Math.round((gross - deductions) * 100) / 100,
        currency: cancelled.currency,
        status: 'PENDING',
        replacesPayoffId: cancelled.id,
        history: [{
          action: 'PAYOFF_CREATED_AS_REPLACEMENT',
          by: currentUser.id,
          byName: currentUser.name,
          at: new Date().toISOString(),
          notes: `Replaces ${cancelled.payoffNumber}${reason ? `. ${reason}` : ''}`
        }]
      }, { transaction: t });

      addHistory(cancelled, currentUser, 'PAYOFF_REPLACED', `Replaced by ${created.payoffNumber}`);
      await cancelled.save({ transaction: t });
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }

    await createNotification({
      recipient: created.agentId,
      title: 'Replacement payment created',
      message: `Payoff ${created.payoffNumber} replaces the cancelled payment. Your approved commission is unchanged.`,
      type: 'info',
      relatedId: created.id,
      relatedModel: 'Payoff'
    });
    await this._notifyStaff(['head_admission'], currentUser.id, {
      title: 'Replacement payoff created',
      message: `${currentUser.name} created payoff ${created.payoffNumber} to replace a cancelled payoff.`,
      relatedId: created.id
    });

    return await this.getPayoffById(created.id, currentUser);
  }
}

module.exports = new PayoffService();
