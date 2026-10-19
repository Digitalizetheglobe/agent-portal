const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { Invoice, Application, Student, University, User, CommissionSnapshot, Payoff } = require('../models');
const { hasAuthoritativeTuition } = require('../utils/tuitionUtils');
const payoffService = require('./payoffService');
const { scopeWhereToAgents, assertCanAccessAgent } = require('../utils/agentScope');
const { computeCommission, assertRatesSet, round2 } = require('../utils/commission');
const { createNotification } = require('../controllers/notificationController');

// Invoice events: the agent is told about every decision; the Head of Admission about resubmissions
const notifyInvoiceAgent = (invoice, title, message, type = 'info') => createNotification({
  recipient: invoice.agentId,
  title,
  message,
  type,
  relatedId: invoice.id,
  relatedModel: 'Invoice'
});

const notifyHeadsOfAdmission = async (invoice, title, message) => {
  const heads = await User.findAll({
    where: { role: 'admin', status: 'active', staffRole: 'head_admission' },
    attributes: ['id']
  });
  await Promise.all(heads.map(head => createNotification({
    recipient: head.id,
    title,
    message,
    type: 'info',
    relatedId: invoice.id,
    relatedModel: 'Invoice'
  })));
};

const ALLOWED_REVIEW_STATUSES = [
  'PendingReview',
  'UnderReview',
  'CorrectionRequired',
  'Resubmitted',
  'Approved',
  'Rejected'
];
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

  // Commission Snapshots
  const snapshots = await CommissionSnapshot.findAll({
    where: { invoiceId: inv.id }
  });
  inv.commissionSnapshots = snapshots.map(s => s.toJSON());

  // Commission per application. The rate comes from each application's university; once the
  // invoice is approved the locked snapshots are the truth, before that it is calculated live.
  if (inv.commissionSnapshots.length) {
    const byApp = new Map((inv.applications || []).map(a => [String(a.id), a]));
    const lines = inv.commissionSnapshots.map((snap) => {
      const app = byApp.get(String(snap.applicationId)) || {};
      return {
        applicationId: snap.applicationId,
        applicationNumber: app.applicationNumber || null,
        universityId: app.universityId || null,
        universityName: app.university ? app.university.name : null,
        tuition: snap.contractualTuition,
        rate: snap.commissionRate,
        gross: snap.grossAmount
      };
    });
    inv.commissionBreakdown = {
      locked: true,
      lines,
      total: round2(lines.reduce((sum, l) => sum + l.gross, 0)),
      blendedRate: inv.commissionRate,
      missing: []
    };
  } else {
    inv.commissionBreakdown = { locked: false, ...(await computeCommission(inv.applications || [])) };
  }

  // Linked Payoff
  // The active payoff, or the latest cancelled one when it has not been replaced yet
  const payoff = await Payoff.findOne({
    where: { invoiceId: inv.id },
    order: [[sequelize.literal(`("status" = 'CANCELLED')`), 'ASC'], ['createdAt', 'DESC']]
  });
  inv.payoff = payoff ? payoff.toJSON() : null;

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
      // Default surfaces PendingReview and Resubmitted invoices
      where.financeReviewStatus = { [Op.in]: ['PendingReview', 'Resubmitted'] };
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
    // Account Managers only see invoices of their own agents
    await scopeWhereToAgents(where, currentUser);

    // 4. Search filter (invoiceNumber, remarks, agent agency)
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { invoiceNumber: { [Op.iLike]: term } },
        { remarks: { [Op.iLike]: term } },
        { financeReviewNotes: { [Op.iLike]: term } },
        { financeRejectionReason: { [Op.iLike]: term } }
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
        },
        {
          model: Payoff,
          as: 'payoff'
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
      invoices: rows.map(inv => inv.toJSON()),
      pagination: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        totalPages
      }
    };
  }

  /**
   * Get single invoice for review with full context
   */
  async getInvoiceForReview(invoiceId, currentUser) {
    const invoice = await Invoice.findByPk(invoiceId, {
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email', 'agencyName', 'phone', 'region']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Application,
          as: 'applications',
          include: [
            {
              model: Student,
              as: 'student',
              attributes: ['id', 'name', 'email', 'country', 'education', 'verificationStatus', 'documents']
            },
            {
              model: University,
              as: 'university',
              attributes: ['id', 'name', 'code', 'country', 'city', 'website', 'logoUrl']
            }
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
    await assertCanAccessAgent(currentUser, invoice.agentId);

    return await formatReview(invoice);
  }

  /**
   * Start review on an invoice (PendingReview/Resubmitted -> UnderReview)
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

      if (invoice.financeReviewStatus !== 'PendingReview' && invoice.financeReviewStatus !== 'Resubmitted') {
        const err = new Error(`Invalid review transition from ${invoice.financeReviewStatus} to UnderReview`);
        err.statusCode = 400;
        throw err;
      }

      const prevStatus = invoice.financeReviewStatus;
      invoice.financeReviewStatus = 'UnderReview';
      invoice.financeReviewedBy = currentUser.id;
      invoice.financeReviewedAt = new Date();

      // Append to history
      const history = Array.isArray(invoice.financeReviewHistory) ? [...invoice.financeReviewHistory] : [];
      history.push({
        action: 'REVIEW_STARTED',
        from: prevStatus,
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
   * Approve invoice review (UnderReview -> Approved)
   * Transaction-safe: creates CommissionSnapshots + Payoff
   */
  async approveInvoice(invoiceId, { notes }, currentUser) {
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
      if (invoice.financeReviewStatus === 'PendingReview' || invoice.financeReviewStatus === 'Resubmitted') {
        const err = new Error('Cannot approve review directly before review has started. Review must be started first.');
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

      if (invoice.financeReviewStatus === 'CorrectionRequired') {
        const err = new Error('Cannot approve an invoice in CorrectionRequired state. It must be resubmitted and reviewed first.');
        err.statusCode = 400;
        throw err;
      }

      if (invoice.financeReviewStatus !== 'UnderReview') {
        const err = new Error(`Invalid transition from ${invoice.financeReviewStatus} to Approved`);
        err.statusCode = 400;
        throw err;
      }

      // Fetch linked applications
      const apps = await Application.findAll({
        where: { invoiceId: invoice.id },
        transaction: t
      });

      if (apps.length === 0) {
        const err = new Error('Invoice has no linked applications');
        err.statusCode = 400;
        throw err;
      }

      // Verify authoritative tuition on each application
      for (const app of apps) {
        if (!hasAuthoritativeTuition(app)) {
          const err = new Error(`Application ${app.applicationNumber || app.id} lacks verified authoritative tuition fee`);
          err.statusCode = 400;
          throw err;
        }
      }

      // Commission is set per university: every application uses its own university's rate,
      // read now and locked into the snapshot below. A university with no rate blocks approval.
      const commission = await computeCommission(apps, { transaction: t });
      assertRatesSet(commission);
      const lineByApp = new Map(commission.lines.map(l => [String(l.applicationId), l]));
      invoice.commissionRate = commission.blendedRate;
      let calculatedTotalGross = 0;

      // ─── CommissionSnapshot Generation ──────────────────────────────────────
      for (const app of apps) {
        const contractualTuition = parseFloat(app.tuitionFee);
        const commissionableTuition = contractualTuition;
        const line = lineByApp.get(String(app.id));
        const activeRate = line.rate;
        const grossAmount = line.gross;
        calculatedTotalGross += grossAmount;

        // Idempotent creation check
        const existingSnapshot = await CommissionSnapshot.findOne({
          where: { applicationId: app.id, invoiceId: invoice.id },
          transaction: t
        });

        if (!existingSnapshot) {
          await CommissionSnapshot.create({
            applicationId: app.id,
            invoiceId: invoice.id,
            contractualTuition,
            commissionableTuition,
            commissionRate: activeRate,
            grossAmount,
            lockedAt: new Date(),
            lockedBy: currentUser.id
          }, { transaction: t });
        }
      }

      calculatedTotalGross = Math.round(calculatedTotalGross * 100) / 100;
      invoice.amount = calculatedTotalGross;
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

      // ─── Payoff Generation ────────────────────────────────────────────────
      // The payoff is in the applications' currency; the university payment must be recorded in it
      const payoffCurrencies = new Set(apps.map(a => (a.currency || 'USD').toUpperCase()));
      if (payoffCurrencies.size > 1) {
        const err = new Error('This invoice mixes currencies, so it cannot be paid. Ask the agent to raise separate invoices.');
        err.statusCode = 400;
        throw err;
      }
      await payoffService.createPayoffForApprovedInvoice(invoice, calculatedTotalGross, currentUser, t, [...payoffCurrencies][0]);

      await t.commit();

      await notifyInvoiceAgent(
        invoice,
        'Invoice approved',
        `Invoice ${invoice.invoiceNumber} was approved and is now Processing. You will be paid once the university has paid QStudy.`,
        'success'
      );

      return await this.getInvoiceForReview(invoice.id, currentUser);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Request correction on invoice (UnderReview -> CorrectionRequired)
   * Admin only.
   */
  async requestCorrection(invoiceId, { reason, remarks }, currentUser) {
    if (currentUser.role !== 'admin') {
      const err = new Error('Access denied. Only admin can request invoice corrections.');
      err.statusCode = 403;
      throw err;
    }

    const note = (remarks || reason || '').trim();
    if (!note) {
      const err = new Error('Correction reason/remarks are required');
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

      if (invoice.financeReviewStatus === 'PendingReview' || invoice.financeReviewStatus === 'Resubmitted') {
        const err = new Error('Cannot request correction before review has started. Review must be started first.');
        err.statusCode = 400;
        throw err;
      }

      if (invoice.financeReviewStatus === 'Approved') {
        const err = new Error('Cannot request correction on an already approved invoice');
        err.statusCode = 400;
        throw err;
      }

      if (invoice.financeReviewStatus === 'Rejected') {
        const err = new Error('Cannot request correction on a rejected invoice');
        err.statusCode = 400;
        throw err;
      }

      if (invoice.financeReviewStatus !== 'UnderReview') {
        const err = new Error(`Invalid transition from ${invoice.financeReviewStatus} to CorrectionRequired`);
        err.statusCode = 400;
        throw err;
      }

      invoice.financeReviewStatus = 'CorrectionRequired';
      invoice.financeReviewedBy = currentUser.id;
      invoice.financeReviewedAt = new Date();
      invoice.financeReviewNotes = note;

      const history = Array.isArray(invoice.financeReviewHistory) ? [...invoice.financeReviewHistory] : [];
      history.push({
        action: 'CORRECTION_REQUIRED',
        from: 'UnderReview',
        to: 'CorrectionRequired',
        notes: note,
        changedBy: currentUser.id,
        changedAt: new Date().toISOString()
      });
      invoice.financeReviewHistory = history;

      await invoice.save({ transaction: t });
      await t.commit();

      await notifyInvoiceAgent(
        invoice,
        'Invoice needs changes',
        `Invoice ${invoice.invoiceNumber} was returned for correction: ${note}`,
        'warning'
      );

      return await this.getInvoiceForReview(invoice.id, currentUser);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Resubmit invoice after correction (CorrectionRequired -> Resubmitted)
   * Caller must be the agent who owns the invoice (or admin).
   */
  async resubmitInvoice(invoiceId, { remarks, invoiceUrl }, currentUser) {
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

      // Role & ownership check
      if (currentUser.role === 'agent' && invoice.agentId.toString() !== currentUser.id.toString()) {
        const err = new Error('Access denied. You do not own this invoice.');
        err.statusCode = 403;
        throw err;
      }
      await assertCanAccessAgent(currentUser, invoice.agentId);

      // Lifecycle check
      if (invoice.financeReviewStatus === 'Rejected') {
        const err = new Error('Rejected invoices cannot be resubmitted');
        err.statusCode = 400;
        throw err;
      }

      if (invoice.financeReviewStatus === 'Approved') {
        const err = new Error('Approved invoices cannot be resubmitted');
        err.statusCode = 400;
        throw err;
      }

      if (invoice.financeReviewStatus !== 'CorrectionRequired') {
        const err = new Error(`Invoice is not in CorrectionRequired state (current: ${invoice.financeReviewStatus})`);
        err.statusCode = 400;
        throw err;
      }

      // Allowed agent updates only (remarks, invoiceUrl)
      if (remarks !== undefined) {
        invoice.remarks = remarks ? remarks.trim() : invoice.remarks;
      }
      if (invoiceUrl !== undefined) {
        invoice.invoiceUrl = invoiceUrl ? invoiceUrl.trim() : invoice.invoiceUrl;
      }

      invoice.financeReviewStatus = 'Resubmitted';

      const history = Array.isArray(invoice.financeReviewHistory) ? [...invoice.financeReviewHistory] : [];
      history.push({
        action: 'RESUBMITTED',
        from: 'CorrectionRequired',
        to: 'Resubmitted',
        notes: remarks ? remarks.trim() : 'Invoice resubmitted by agent',
        changedBy: currentUser.id,
        changedAt: new Date().toISOString()
      });
      invoice.financeReviewHistory = history;

      await invoice.save({ transaction: t });
      await t.commit();

      await notifyHeadsOfAdmission(
        invoice,
        'Invoice resubmitted',
        `Invoice ${invoice.invoiceNumber} was corrected and resubmitted for review.`
      );

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
      if (invoice.financeReviewStatus === 'PendingReview' || invoice.financeReviewStatus === 'Resubmitted') {
        const err = new Error('Cannot reject review directly before review has started. Review must be started first.');
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

      await invoice.save({ transaction: t });
      await t.commit();

      await notifyInvoiceAgent(
        invoice,
        'Invoice rejected',
        `Invoice ${invoice.invoiceNumber} was rejected: ${reason.trim()}`,
        'error'
      );

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
    const invoice = await this.getInvoiceForReview(invoiceId, currentUser);
    return Array.isArray(invoice.financeReviewHistory) ? invoice.financeReviewHistory : [];
  }
}

module.exports = new InvoiceReviewService();
