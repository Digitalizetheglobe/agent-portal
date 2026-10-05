const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { Payoff, Invoice, User, Application, Student, University, CommissionSnapshot } = require('../models');

const ALLOWED_PAYOFF_STATUSES = ['PENDING', 'SETTLED', 'CANCELLED'];

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
  async createPayoffForApprovedInvoice(invoice, grossCommission, currentUser, transaction = null) {
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
      currency: invoice.currency || 'USD',
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

    return payoff.toJSON();
  }

  /**
   * Admin settles a pending payoff (human-confirmed offline settlement recording).
   */
  async settlePayoff(id, data, currentUser) {
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

      payoff.status = 'SETTLED';
      payoff.settlementReference = settlementReference.trim();
      payoff.settledAt = parsedSettledAt;
      payoff.settledBy = currentUser.id;
      if (settlementNotes !== undefined) payoff.settlementNotes = settlementNotes ? settlementNotes.trim() : null;
      if (batchReference !== undefined) payoff.batchReference = batchReference ? batchReference.trim() : null;

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
