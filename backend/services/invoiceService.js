const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { Invoice, Application, Student, University, User, Payoff } = require('../models');
const { hasAuthoritativeTuition } = require('../utils/tuitionUtils');
const { scopeWhereToAgents, assertCanAccessAgent } = require('../utils/agentScope');
const { computeCommission, assertRatesSet } = require('../utils/commission');
const { createNotification } = require('../controllers/notificationController');

const ALLOWED_STATUSES = ['Pending', 'Paid', 'Rejected'];

// Generate collision-safe unique invoice number
const generateInvoiceNumber = async () => {
  let invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  let exists = await Invoice.findOne({ where: { invoiceNumber } });
  while (exists) {
    invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    exists = await Invoice.findOne({ where: { invoiceNumber } });
  }
  return invoiceNumber;
};

// Helper to format invoice with populated agent, legacy students, and linked applications
const formatInvoice = async (invoice) => {
  const inv = invoice.toJSON ? invoice.toJSON() : { ...invoice };

  // 1. Populate agent
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

  // 1b. Populate reviewer if exists
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

  // 2. Populate legacy students
  const rawStudentIds = Array.isArray(inv.studentIds) ? inv.studentIds : [];
  if (rawStudentIds.length > 0) {
    // If array of IDs, resolve student records
    const stringIds = rawStudentIds.filter(s => typeof s === 'string');
    if (stringIds.length > 0) {
      const students = await Student.findAll({
        where: { id: { [Op.in]: stringIds } },
        attributes: ['id', 'name', 'email']
      });
      inv.studentIds = students.map(s => s.toJSON());
    }
  } else {
    inv.studentIds = [];
  }

  // 3. Populate linked applications if not already populated
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
        'status',
        'isInvoiceEligible',
        'isInvoiced',
        'invoiceId'
      ],
      include: [
        { model: Student, as: 'student', attributes: ['id', 'name', 'email'] },
        { model: University, as: 'university', attributes: ['id', 'name', 'code'] }
      ]
    });
    inv.applications = applications.map(app => app.toJSON());
  }

  return inv;
};

class InvoiceService {
  /**
   * Create an invoice for applications whose student reached Visa 100% with the fees confirmed
   */
  async createInvoice(data, currentUser) {
    const {
      applicationIds,
      amount,
      commissionRate,
      remarks,
      invoiceUrl
    } = data;

    // Check authorization: agents and admins can create invoices
    if (currentUser.role !== 'agent' && currentUser.role !== 'admin') {
      const err = new Error('Access denied. Only agents or admins can create invoices');
      err.statusCode = 403;
      throw err;
    }

    if (applicationIds) {
      if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
        const err = new Error('Please provide at least one application ID');
        err.statusCode = 400;
        throw err;
      }

      // Check for duplicate application IDs
      const uniqueIds = new Set(applicationIds);
      if (uniqueIds.size !== applicationIds.length) {
        const err = new Error('Duplicate application IDs in request are not allowed');
        err.statusCode = 400;
        throw err;
      }

      // Fetch all specified applications
      const applications = await Application.findAll({
        where: { id: { [Op.in]: applicationIds } }
      });

      if (applications.length !== applicationIds.length) {
        const err = new Error('One or more applications not found');
        err.statusCode = 404;
        throw err;
      }

      // Validate each application
      for (const app of applications) {
        // Ownership check: Agents can only invoice own applications
        if (currentUser.role === 'agent' && app.agentId.toString() !== currentUser.id.toString()) {
          const err = new Error(`Access denied. You do not own application ${app.applicationNumber || app.id}`);
          err.statusCode = 403;
          throw err;
        }
        await assertCanAccessAgent(currentUser, app.agentId);

        // Lifecycle check: the visa pipeline must be complete (Visa 100% and fees accepted)
        if (app.pipelineStage !== 'Visa100' || app.feeStatus !== 'Accepted') {
          const err = new Error(`Application ${app.applicationNumber || app.id} cannot be invoiced yet: the student must reach Visa 100% and the fees must be confirmed (Pending Fees).`);
          err.statusCode = 400;
          throw err;
        }

        // Eligibility check: isInvoiceEligible must be true
        if (!app.isInvoiceEligible) {
          const err = new Error(`Application ${app.applicationNumber || app.id} is not marked eligible for invoicing`);
          err.statusCode = 400;
          throw err;
        }

        const student = await Student.findByPk(app.studentId);
        if (!student || student.verificationStatus === 'Rejected') {
          const err = new Error(`The student of application ${app.applicationNumber || app.id} was rejected in verification, so it cannot be invoiced`);
          err.statusCode = 400;
          throw err;
        }

        // Authoritative Tuition Fee Verification (Rule T3: Unknown tuition blocks invoicing)
        if (!hasAuthoritativeTuition(app)) {
          const err = new Error(`Cannot invoice application ${app.applicationNumber || app.id} without verified authoritative tuition fee`);
          err.statusCode = 400;
          throw err;
        }

        // Invoiced check: cannot invoice already-invoiced application
        if (app.isInvoiced || app.invoiceId) {
          const err = new Error(`Application ${app.applicationNumber || app.id} has already been invoiced`);
          err.statusCode = 400;
          throw err;
        }
      }

      // One university and one currency per invoice: each university pays QStudy separately (and
      // the agent is paid in the currency the university paid), so mixed invoices cannot be settled.
      const universityIds = new Set(applications.map(a => String(a.universityId)));
      if (universityIds.size > 1) {
        const err = new Error('An invoice can only include applications for one university. Raise a separate invoice for each university.');
        err.statusCode = 400;
        throw err;
      }
      const currencies = new Set(applications.map(a => (a.currency || 'USD').toUpperCase()));
      if (currencies.size > 1) {
        const err = new Error('An invoice can only include applications in one currency. Raise a separate invoice for each currency.');
        err.statusCode = 400;
        throw err;
      }

      // Commission is set per university by the Head of Admission (see utils/commission.js).
      // Nobody enters a rate or an amount on an invoice: the server calculates both.
      if (commissionRate !== undefined && commissionRate !== null && commissionRate !== '') {
        const err = new Error('Commission is set per university and cannot be entered on an invoice.');
        err.statusCode = currentUser.role === 'agent' ? 403 : 400;
        throw err;
      }
      const commission = await computeCommission(applications);
      assertRatesSet(commission);
      const effectiveCommissionRate = commission.blendedRate; // blended % across universities, for display
      const serverCalculatedAmount = commission.total;

      if (amount !== undefined && amount !== null && amount !== '') {
        if (currentUser.role === 'agent') {
          const err = new Error('Access denied. Invoice amounts are server-calculated.');
          err.statusCode = 400;
          throw err;
        }
        // If an admin passes an amount, it must match the server calculation
        const submittedAmount = parseFloat(amount);
        if (isNaN(submittedAmount) || Math.abs(submittedAmount - serverCalculatedAmount) > 0.05) {
          const err = new Error(`Invoice amount manipulation detected. Authoritative calculated amount is $${serverCalculatedAmount.toFixed(2)}.`);
          err.statusCode = 400;
          throw err;
        }
      }

      // Determine effective agentId
      const effectiveAgentId = currentUser.role === 'agent'
        ? currentUser.id
        : (data.agentId || applications[0].agentId);

      // Execute transaction for atomic invoice creation and application linking
      const t = await sequelize.transaction();
      try {
        const invoiceNumber = await generateInvoiceNumber();

        const invoice = await Invoice.create({
          agentId: effectiveAgentId,
          studentIds: applications.map(a => a.studentId),
          invoiceNumber,
          amount: serverCalculatedAmount,
          commissionRate: effectiveCommissionRate,
          remarks: remarks || null,
          invoiceUrl: invoiceUrl || null,
          status: 'Pending'
        }, { transaction: t });

        // Link applications atomically
        for (const app of applications) {
          app.isInvoiced = true;
          app.invoiceId = invoice.id;

          const history = Array.isArray(app.history) ? [...app.history] : [];
          history.push({
            action: 'INVOICED',
            notes: `Application linked to invoice ${invoiceNumber}`,
            changedBy: currentUser.id,
            changedAt: new Date().toISOString()
          });
          app.history = history;

          await app.save({ transaction: t });
        }

        await t.commit();

        // Tell the Head of Admission there is a new invoice to review
        if (currentUser.role === 'agent') {
          const heads = await User.findAll({
            where: { role: 'admin', status: 'active', staffRole: 'head_admission' },
            attributes: ['id']
          });
          await Promise.all(heads.map(head => createNotification({
            recipient: head.id,
            title: 'New invoice to review',
            message: `${currentUser.name || 'An agent'} raised invoice ${invoice.invoiceNumber} for review.`,
            type: 'info',
            relatedId: invoice.id,
            relatedModel: 'Invoice'
          })));
        }

        return await this.getInvoiceById(invoice.id, currentUser);
      } catch (error) {
        await t.rollback();
        throw error;
      }
    }

    // No applications were provided
    const err = new Error('Please provide the applications to invoice (applicationIds)');
    err.statusCode = 400;
    throw err;
  }

  /**
   * Get all invoices with pagination, search, and status filtering
   */
  async getInvoices(query = {}, currentUser) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      agentId
    } = query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (parsedPage - 1) * parsedLimit;

    const where = {};

    // 1. Role-based isolation
    if (currentUser.role === 'agent') {
      where.agentId = currentUser.id;
    } else if (agentId) {
      where.agentId = agentId;
    }
    // Account Managers only see invoices of their own agents
    await scopeWhereToAgents(where, currentUser);

    // 2. Status filter
    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        const err = new Error(`Invalid status filter. Allowed values: ${ALLOWED_STATUSES.join(', ')}`);
        err.statusCode = 400;
        throw err;
      }
      where.status = status;
    }

    // 3. Search filter
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
            'status',
            'isInvoiceEligible',
            'isInvoiced',
            'invoiceId'
          ],
          include: [
            { model: Student, as: 'student', attributes: ['id', 'name', 'email'] },
            { model: University, as: 'university', attributes: ['id', 'name', 'code'] }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parsedLimit,
      offset,
      distinct: true
    });

    const formattedInvoices = await Promise.all(
      rows.map(inv => formatInvoice(inv))
    );

    const totalPages = Math.ceil(count / parsedLimit) || 1;

    return {
      total: count,
      page: parsedPage,
      limit: parsedLimit,
      totalPages,
      invoices: formattedInvoices,
      data: formattedInvoices,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: count,
        totalPages
      }
    };
  }

  /**
   * Get single invoice by ID
   */
  async getInvoiceById(id, currentUser) {
    const invoice = await Invoice.findByPk(id, {
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email', 'agencyName']
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
            'status',
            'isInvoiceEligible',
            'isInvoiced',
            'invoiceId'
          ],
          include: [
            { model: Student, as: 'student', attributes: ['id', 'name', 'email'] },
            { model: University, as: 'university', attributes: ['id', 'name', 'code'] }
          ]
        }
      ]
    });

    if (!invoice) {
      const err = new Error('Invoice not found');
      err.statusCode = 404;
      throw err;
    }

    // Agent access check
    if (currentUser.role === 'agent' && invoice.agentId.toString() !== currentUser.id.toString()) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }
    await assertCanAccessAgent(currentUser, invoice.agentId);

    return await formatInvoice(invoice);
  }

  /**
   * Get applications eligible for invoicing
   */
  async getEligibleApplications(query = {}, currentUser) {
    const {
      page = 1,
      limit = 20,
      universityId,
      search
    } = query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (parsedPage - 1) * parsedLimit;

    const where = {
      isInvoiceEligible: true,
      pipelineStage: 'Visa100',
      feeStatus: 'Accepted',
      isInvoiced: false,
      invoiceId: null
    };

    // Agent isolation
    if (currentUser.role === 'agent') {
      where.agentId = currentUser.id;
    } else if (query.agentId) {
      where.agentId = query.agentId;
    }
    await scopeWhereToAgents(where, currentUser);

    if (universityId) {
      where.universityId = universityId;
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { applicationNumber: { [Op.iLike]: term } },
        { courseName: { [Op.iLike]: term } }
      ];
    }

    const { count, rows } = await Application.findAndCountAll({
      where,
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone', 'country']
        },
        {
          model: University,
          as: 'university',
          attributes: ['id', 'name', 'code', 'country', 'city', 'commissionRate']
        },
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email', 'agencyName']
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
      applications: rows.map(app => app.toJSON()),
      data: rows.map(app => app.toJSON()),
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: count,
        totalPages
      }
    };
  }

  /**
   * Update invoice status (Admin only)
   */
  async updateInvoiceStatus(id, { status, remarks }, currentUser) {
    if (currentUser.role !== 'admin') {
      const err = new Error('Only admins can update invoice status');
      err.statusCode = 403;
      throw err;
    }

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      const err = new Error(`Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const invoice = await Invoice.findByPk(id, {
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email', 'agencyName']
        }
      ]
    });

    if (!invoice) {
      const err = new Error('Invoice not found');
      err.statusCode = 404;
      throw err;
    }
    await assertCanAccessAgent(currentUser, invoice.agentId);

    // Payment to the agent is recorded on the payoff (university payment first, then the payment
    // slip). Marking an invoice Paid here would skip those steps.
    if (status === 'Paid') {
      const err = new Error('An invoice becomes Paid when Accounts settles its payoff, with the payment slip. Use the Payoffs page.');
      err.statusCode = 400;
      throw err;
    }

    invoice.status = status;
    if (status === 'Paid') {
      if (invoice.financeReviewStatus !== 'Approved') {
        const err = new Error(`Invoice cannot be marked as Paid before Finance Review approval (current: ${invoice.financeReviewStatus})`);
        err.statusCode = 400;
        throw err;
      }
      if (invoice.commissionRate <= 0 || invoice.amount <= 0) {
        const err = new Error('Cannot mark invoice Paid without verified positive commission rate and amount');
        err.statusCode = 400;
        throw err;
      }
      invoice.paidAt = new Date();

      // Settlement attribution
      const settlementPrefix = `[Settled by Admin ${currentUser.name || currentUser.email || currentUser.id}]`;
      if (remarks && remarks.trim()) {
        invoice.remarks = `${settlementPrefix} ${remarks.trim()}`;
      } else if (!invoice.remarks || !invoice.remarks.includes('[Settled by Admin')) {
        invoice.remarks = settlementPrefix;
      }

      // Legacy synchronization with Payoff entity
      const { Payoff } = require('../models');
      const payoff = await Payoff.findOne({ where: { invoiceId: invoice.id, status: 'PENDING' } });
      if (payoff && payoff.status === 'PENDING') {
        payoff.status = 'SETTLED';
        payoff.settledAt = invoice.paidAt;
        payoff.settledBy = currentUser.id;
        payoff.settlementReference = remarks ? remarks.trim().slice(0, 100) : `LEGACY-${invoice.invoiceNumber}`;
        payoff.settlementNotes = remarks ? remarks.trim() : 'Settled via legacy invoice status update';
        await payoff.save();
      }
    } else if (remarks !== undefined) {
      invoice.remarks = remarks;
    }

    await invoice.save();

    return await formatInvoice(invoice);
  }

  /**
   * Delete invoice and safely unlink associated applications
   */
  async deleteInvoice(id, currentUser) {
    const invoice = await Invoice.findByPk(id);

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
    await assertCanAccessAgent(currentUser, invoice.agentId);

    const t = await sequelize.transaction();
    try {
      // Same row lock the finance review takes when approving: the invoice cannot be approved (or
      // given a payoff) between this check and the delete. Re-read under the lock.
      const locked = await Invoice.findByPk(id, { lock: t.LOCK.UPDATE, transaction: t });
      if (!locked) {
        const err = new Error('Invoice not found');
        err.statusCode = 404;
        throw err;
      }

      if (locked.status === 'Paid') {
        const err = new Error('Cannot delete a paid invoice');
        err.statusCode = 400;
        throw err;
      }

      // An approved invoice has locked commission and a payoff trail (even a cancelled payoff is
      // part of the financial history), so it can never be deleted.
      const payoffCount = await Payoff.count({ where: { invoiceId: locked.id }, transaction: t });
      if (locked.financeReviewStatus === 'Approved' || payoffCount > 0) {
        const err = new Error('Cannot delete this invoice because it has been approved or has payoff history.');
        err.statusCode = 409;
        throw err;
      }

      // Unlink applications so their state doesn't stay orphaned
      await Application.update(
        { isInvoiced: false, invoiceId: null },
        { where: { invoiceId: locked.id }, transaction: t }
      );

      await locked.destroy({ transaction: t });

      await t.commit();

      return {
        success: true,
        detail: 'Invoice deleted successfully'
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

module.exports = new InvoiceService();
