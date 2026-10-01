const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { Invoice, Application, Student, University, User } = require('../models');

const ALLOWED_REVIEW_STATUSES = ['PendingReview', 'UnderReview', 'Approved', 'Rejected'];
const ALLOWED_INVOICE_STATUSES = ['Pending', 'Paid', 'Rejected'];

// Helper to format review record
const formatReview = async (invoice) => {
  const inv = invoice.toJSON ? invoice.toJSON() : { ...invoice };

  // Agent
  if (invoice.agent) {
    inv.agentId = {
      id: invoice.agent.id,
      _id: invoice.agent.id,
      name: invoice.agent.name,
      email: invoice.agent.email,
      agencyName: invoice.agent.agencyName
    };
  } else if (inv.agentId && typeof inv.agentId === 'string') {
    const agent = await User.findByPk(inv.agentId, {
      attributes: ['id', 'name', 'email', 'agencyName']
    });
    if (agent) {
      inv.agentId = {
        id: agent.id,
        _id: agent.id,
        name: agent.name,
        email: agent.email,
        agencyName: agent.agencyName
      };
    }
  }

  // Reviewer
  if (invoice.reviewer) {
    inv.reviewer = {
      id: invoice.reviewer.id,
      name: invoice.reviewer.name,
      email: invoice.reviewer.email
    };
  } else if (inv.financeReviewedBy) {
    const reviewer = await User.findByPk(inv.financeReviewedBy, {
      attributes: ['id', 'name', 'email']
    });
    if (reviewer) {
      inv.reviewer = reviewer.toJSON();
    }
  }

  // Applications
  if (invoice.applications && Array.isArray(invoice.applications)) {
    inv.applications = invoice.applications.map(app => (app.toJSON ? app.toJSON() : app));
  } else {
    const applications = await Application.findAll({
      where: { invoiceId: inv.id },
      attributes: [
        'id',
        'applicationNumber',
        'studentId',
        'agentId',
        'universityId',
        'courseName',
        'courseLevel',
        'tuitionFee',
        'currency',
        'status',
        'isInvoiceEligible',
        'isInvoiced',
        'invoiceId'
      ],
      include: [
        { model: Student, as: 'student', attributes: ['id', 'name', 'email', 'country'] },
        { model: University, as: 'university', attributes: ['id', 'name', 'code', 'country', 'city'] }
      ]
    });
    inv.applications = applications.map(app => app.toJSON());
  }

  return inv;
};

class InvoiceReviewService {
  /**
   * Get finance review queue
   */
  async getReviewQueue(query = {}, currentUser) {
    if (currentUser.role !== 'admin') {
      const err = new Error('Access denied. Finance review queue is restricted to admin.');
      err.statusCode = 403;
      throw err;
    }

    const {
      page = 1,
      limit = 20,
      financeReviewStatus,
      status,
      search,
      agentId,
      all
    } = query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (parsedPage - 1) * parsedLimit;

    const where = {};

    // 1. Review status filter
    if (financeReviewStatus) {
      if (financeReviewStatus === 'ALL' || all === 'true') {
        // No review status filter
      } else {
        if (!ALLOWED_REVIEW_STATUSES.includes(financeReviewStatus)) {
          const err = new Error(`Invalid financeReviewStatus filter. Allowed: ${ALLOWED_REVIEW_STATUSES.join(', ')}`);
          err.statusCode = 400;
          throw err;
        }
        where.financeReviewStatus = financeReviewStatus;
      }
    } else if (all !== 'true') {
      // Default to PendingReview
      where.financeReviewStatus = 'PendingReview';
    }

    // 2. Invoice payment status filter
    if (status) {
      if (!ALLOWED_INVOICE_STATUSES.includes(status)) {
        const err = new Error(`Invalid status filter. Allowed: ${ALLOWED_INVOICE_STATUSES.join(', ')}`);
        err.statusCode = 400;
        throw err;
      }
      where.status = status;
    }

    // 3. Agent filter
    if (agentId) {
      where.agentId = agentId;
    }

    // 4. Search filter
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { invoiceNumber: { [Op.iLike]: term } },
        { remarks: { [Op.iLike]: term } }
      ];
    }

    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email', 'agencyName']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Application,
          as: 'applications',
          attributes: [
            'id',
            'applicationNumber',
            'studentId',
            'agentId',
            'universityId',
            'courseName',
            'courseLevel',
            'status',
            'isInvoiceEligible',
            'isInvoiced',
            'invoiceId'
          ],
          include: [
            { model: Student, as: 'student', attributes: ['id', 'name', 'email', 'country'] },
            { model: University, as: 'university', attributes: ['id', 'name', 'code', 'country', 'city'] }
          ]
        }
      ],
      order: [['raisedAt', 'DESC']],
      limit: parsedLimit,
      offset,
      distinct: true
    });

    const formatted = await Promise.all(rows.map(inv => formatReview(inv)));
    const totalPages = Math.ceil(count / parsedLimit) || 1;

    return {
      total: count,
      page: parsedPage,
      limit: parsedLimit,
      totalPages,
      reviews: formatted,
      data: formatted,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: count,
        totalPages
      }
    };
  }

  /**
   * Get single invoice review detail
   */
  async getInvoiceForReview(invoiceId, currentUser) {
    const invoice = await Invoice.findByPk(invoiceId, {
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email', 'agencyName']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Application,
          as: 'applications',
          attributes: [
            'id',
            'applicationNumber',
            'studentId',
            'agentId',
            'universityId',
            'courseName',
            'courseLevel',
            'status',
            'isInvoiceEligible',
            'isInvoiced',
            'invoiceId'
          ],
          include: [
            { model: Student, as: 'student', attributes: ['id', 'name', 'email', 'country'] },
            { model: University, as: 'university', attributes: ['id', 'name', 'code', 'country', 'city'] }
          ]
        }
      ]
    });

    if (!invoice) {
      const err = new Error('Invoice not found');
      err.statusCode = 404;
      throw err;
    }

    // Agent access check: Agents can only view their own invoice review state
    if (currentUser.role === 'agent' && invoice.agentId.toString() !== currentUser.id.toString()) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }

    return await formatReview(invoice);
  }

  /**
   * Start review on an invoice (PendingReview -> UnderReview)
   */
  async startReview(invoiceId, currentUser) {
    if (currentUser.role !== 'admin') {
      const err = new Error('Access denied. Only admin can start an invoice review.');
      err.statusCode = 403;
      throw err;
    }

    const t = await sequelize.transaction();
    try {
      const invoice = await Invoice.findByPk(invoiceId, {
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (!invoice) {
        const err = new Error('Invoice not found');
        err.statusCode = 404;
        throw err;
      }

      // Transition validation
      if (invoice.financeReviewStatus === 'UnderReview') {
        const err = new Error('Invoice is already under review');
        err.statusCode = 400;
        throw err;
      }

      if (invoice.financeReviewStatus === 'Approved' || invoice.financeReviewStatus === 'Rejected') {
        const err = new Error(`Cannot start review on already finalized review (status: ${invoice.financeReviewStatus})`);
        err.statusCode = 400;
        throw err;
      }

      if (invoice.financeReviewStatus !== 'PendingReview') {
        const err = new Error(`Invalid review transition from ${invoice.financeReviewStatus} to UnderReview`);
        err.statusCode = 400;
        throw err;
      }

      invoice.financeReviewStatus = 'UnderReview';
      invoice.financeReviewedBy = currentUser.id;
      invoice.financeReviewedAt = new Date();

      // Append to history
      const history = Array.isArray(invoice.financeReviewHistory) ? [...invoice.financeReviewHistory] : [];
      history.push({
        action: 'REVIEW_STARTED',
        from: 'PendingReview',
        to: 'UnderReview',
        notes: null,
        changedBy: currentUser.id,
        changedAt: new Date().toISOString()
      });
      invoice.financeReviewHistory = history;

      await invoice.save({ transaction: t });
      await t.commit();

      return await this.getInvoiceForReview(invoice.id, currentUser);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Set commission rate on invoice (Admin only)
   */
  async setCommissionRate(invoiceId, { commissionRate }, currentUser) {
    if (currentUser.role !== 'admin') {
      const err = new Error('Access denied. Only admin can set commission rates.');
      err.statusCode = 403;
      throw err;
    }

    if (commissionRate === undefined || commissionRate === null || commissionRate === '') {
      const err = new Error('Commission rate is required');
      err.statusCode = 400;
      throw err;
    }

    const parsedRate = parseFloat(commissionRate);
    if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100 || !isFinite(parsedRate)) {
      const err = new Error('Commission rate must be a valid percentage between 0 and 100');
      err.statusCode = 400;
      throw err;
    }

    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      const err = new Error('Invoice not found');
      err.statusCode = 404;
      throw err;
    }

    if (invoice.status === 'Paid') {
      const err = new Error('Cannot modify commission rate on a paid invoice');
      err.statusCode = 400;
      throw err;
    }

    const apps = await Application.findAll({
      where: { invoiceId: invoice.id },
      attributes: ['id', 'tuitionFee']
    });

    const totalTuition = apps.reduce((sum, a) => sum + (parseFloat(a.tuitionFee) || 0), 0);
    const newAmount = Math.round((totalTuition * (parsedRate / 100)) * 100) / 100;

    invoice.commissionRate = parsedRate;
    invoice.amount = newAmount;

    const history = Array.isArray(invoice.financeReviewHistory) ? [...invoice.financeReviewHistory] : [];
    history.push({
      action: 'RATE_ESTABLISHED',
      commissionRate: parsedRate,
      amount: newAmount,
      changedBy: currentUser.id,
      changedAt: new Date().toISOString()
    });
    invoice.financeReviewHistory = history;

    await invoice.save();

    return await formatReview(invoice);
  }

  /**
   * Approve invoice review (UnderReview -> Approved)
   */
  async approveInvoice(invoiceId, { notes, commissionRate }, currentUser) {
    if (currentUser.role !== 'admin') {
      const err = new Error('Access denied. Only admin can approve an invoice review.');
      err.statusCode = 403;
      throw err;
    }

    const t = await sequelize.transaction();
    try {
      const invoice = await Invoice.findByPk(invoiceId, {
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (!invoice) {
        const err = new Error('Invoice not found');
        err.statusCode = 404;
        throw err;
      }

      // Transition validation
      if (invoice.financeReviewStatus === 'PendingReview') {
        const err = new Error('Cannot approve review directly from PendingReview. Review must be started first.');
        err.statusCode = 400;
        throw err;
      }

      if (invoice.financeReviewStatus === 'Approved') {
        const err = new Error('Invoice review is already approved');
        err.statusCode = 400;
        throw err;
      }

      if (invoice.financeReviewStatus === 'Rejected') {
        const err = new Error('Cannot approve a rejected review');
        err.statusCode = 400;
        throw err;
      }

      if (invoice.financeReviewStatus !== 'UnderReview') {
        const err = new Error(`Invalid transition from ${invoice.financeReviewStatus} to Approved`);
        err.statusCode = 400;
        throw err;
      }

      // If Admin provides commissionRate at approval time, update it
      if (commissionRate !== undefined && commissionRate !== null && commissionRate !== '') {
        const parsedRate = parseFloat(commissionRate);
        if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100 || !isFinite(parsedRate)) {
          const err = new Error('Commission rate must be a valid percentage between 0 and 100');
          err.statusCode = 400;
          throw err;
        }

        const apps = await Application.findAll({
          where: { invoiceId: invoice.id },
          attributes: ['id', 'tuitionFee'],
          transaction: t
        });

        const totalTuition = apps.reduce((sum, a) => sum + (parseFloat(a.tuitionFee) || 0), 0);
        invoice.commissionRate = parsedRate;
        invoice.amount = Math.round((totalTuition * (parsedRate / 100)) * 100) / 100;
      }

      // Invariant: An invoice cannot be approved without a verified positive commission rate
      if (invoice.commissionRate <= 0) {
        const err = new Error('Authoritative commission rate must be established by Admin before approving invoice.');
        err.statusCode = 400;
        throw err;
      }

      invoice.financeReviewStatus = 'Approved';
      invoice.financeReviewedBy = currentUser.id;
      invoice.financeReviewedAt = new Date();
      if (notes !== undefined) {
        invoice.financeReviewNotes = notes ? notes.trim() : null;
      }

      // Append history
      const history = Array.isArray(invoice.financeReviewHistory) ? [...invoice.financeReviewHistory] : [];
      history.push({
        action: 'REVIEW_APPROVED',
        from: 'UnderReview',
        to: 'Approved',
        notes: notes ? notes.trim() : 'Invoice approved by finance',
        commissionRate: invoice.commissionRate,
        amount: invoice.amount,
        changedBy: currentUser.id,
        changedAt: new Date().toISOString()
      });
      invoice.financeReviewHistory = history;

      await invoice.save({ transaction: t });
      await t.commit();

      return await this.getInvoiceForReview(invoice.id, currentUser);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Reject invoice review (UnderReview -> Rejected)
   */
  async rejectInvoice(invoiceId, { reason, notes }, currentUser) {
    if (currentUser.role !== 'admin') {
      const err = new Error('Access denied. Only admin can reject an invoice review.');
      err.statusCode = 403;
      throw err;
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      const err = new Error('Rejection reason is required and must be a non-empty string');
      err.statusCode = 400;
      throw err;
    }

    const t = await sequelize.transaction();
    try {
      const invoice = await Invoice.findByPk(invoiceId, {
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (!invoice) {
        const err = new Error('Invoice not found');
        err.statusCode = 404;
        throw err;
      }

      // Transition validation
      if (invoice.financeReviewStatus === 'PendingReview') {
        const err = new Error('Cannot reject review directly from PendingReview. Review must be started first.');
        err.statusCode = 400;
        throw err;
      }

      if (invoice.financeReviewStatus === 'Rejected') {
        const err = new Error('Invoice review is already rejected');
        err.statusCode = 400;
        throw err;
      }

      if (invoice.financeReviewStatus === 'Approved') {
        const err = new Error('Cannot reject an already approved invoice');
        err.statusCode = 400;
        throw err;
      }

      if (invoice.financeReviewStatus !== 'UnderReview') {
        const err = new Error(`Invalid transition from ${invoice.financeReviewStatus} to Rejected`);
        err.statusCode = 400;
        throw err;
      }

      invoice.financeReviewStatus = 'Rejected';
      invoice.financeReviewedBy = currentUser.id;
      invoice.financeReviewedAt = new Date();
      invoice.financeRejectionReason = reason.trim();
      if (notes !== undefined) {
        invoice.financeReviewNotes = notes ? notes.trim() : null;
      }

      // Append history
      const history = Array.isArray(invoice.financeReviewHistory) ? [...invoice.financeReviewHistory] : [];
      history.push({
        action: 'REVIEW_REJECTED',
        from: 'UnderReview',
        to: 'Rejected',
        notes: reason.trim(),
        changedBy: currentUser.id,
        changedAt: new Date().toISOString()
      });
      invoice.financeReviewHistory = history;

      // Note: Invoice.status remains untouched!
      await invoice.save({ transaction: t });
      await t.commit();

      return await this.getInvoiceForReview(invoice.id, currentUser);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Get review audit history
   */
  async getReviewHistory(invoiceId, currentUser) {
    const invoice = await Invoice.findByPk(invoiceId);

    if (!invoice) {
      const err = new Error('Invoice not found');
      err.statusCode = 404;
      throw err;
    }

    if (currentUser.role === 'agent' && invoice.agentId.toString() !== currentUser.id.toString()) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }

    return Array.isArray(invoice.financeReviewHistory) ? invoice.financeReviewHistory : [];
  }
}

module.exports = new InvoiceReviewService();
