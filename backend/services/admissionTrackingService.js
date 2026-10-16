const { sequelize } = require('../config/db');
const { Application, Student, University, User, Invoice } = require('../models');
const { assertCanAccessAgent } = require('../utils/agentScope');
const { isPipelineComplete } = require('../utils/visaPipeline');
const { createNotification } = require('../controllers/notificationController');

// QStudy's review of an application. Everything after the review (visa stages, arrival, registration,
// fees) is the visa pipeline: see visaPipelineService. Offers, admission letters, enrollment and tuition
// deposits are no longer tracked in the portal.
const ALLOWED_STATUSES = [
  'Draft',
  'Submitted',
  'UnderReview',
  'Rejected',
  'Withdrawn'
];

// Workflow transition map
const ALLOWED_TRANSITIONS = {
  Draft: ['Submitted', 'Withdrawn'],
  Submitted: ['UnderReview', 'Withdrawn'],
  UnderReview: ['Rejected', 'Withdrawn'],
  Rejected: [],
  Withdrawn: []
};

// Standard inclusions for application queries
const standardIncludes = [
  {
    model: Student,
    as: 'student',
    attributes: ['id', 'name', 'email', 'phone', 'country', 'education', 'verificationStatus']
  },
  {
    model: User,
    as: 'agent',
    attributes: ['id', 'name', 'email', 'role', 'agencyName', 'phone']
  },
  {
    model: University,
    as: 'university',
    attributes: ['id', 'name', 'code', 'country', 'city', 'website', 'logoUrl', 'status']
  },
  {
    model: Invoice,
    as: 'invoice',
    attributes: ['id', 'invoiceNumber', 'amount', 'status']
  }
];

class AdmissionTrackingService {
  /**
   * Helper to retrieve application and verify user ownership/access
   */
  async _findAndAuthorize(id, currentUser) {
    const application = await Application.findByPk(id, {
      include: standardIncludes
    });

    if (!application) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }

    if (currentUser.role === 'agent' && application.agentId.toString() !== currentUser.id.toString()) {
      const err = new Error('Access denied. You do not own this application.');
      err.statusCode = 403;
      throw err;
    }
    await assertCanAccessAgent(currentUser, application.agentId);

    return application;
  }

  /**
   * Authoritatively derive invoice eligibility from the visa pipeline (client workflow):
   * the student reached Visa 100% and the Head of Admission accepted the proof of fee payment.
   * A student whose verification was rejected is never eligible.
   */
  async deriveInvoiceEligibility(application, transaction = null) {
    let student = application.student;
    if (!student || !student.verificationStatus) {
      student = await Student.findByPk(application.studentId, { transaction });
    }

    const isStudentRejected = student ? student.verificationStatus === 'Rejected' : false;
    const eligible = isPipelineComplete(application) && !isStudentRejected;
    application.isInvoiceEligible = eligible;
    return eligible;
  }

  /**
   * Transition application workflow status
   */
  async updateWorkflowStatus(id, { status: newStatus, notes }, currentUser) {
    if (!newStatus || !ALLOWED_STATUSES.includes(newStatus)) {
      const err = new Error(`Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    // Role-based transition guard: Agents can only submit a draft application or withdraw
    if (currentUser.role === 'agent') {
      const agentAllowedStatuses = ['Submitted', 'Withdrawn'];
      if (!agentAllowedStatuses.includes(newStatus)) {
        const err = new Error(`Access denied. Agents cannot transition application to '${newStatus}'.`);
        err.statusCode = 403;
        throw err;
      }
    }

    const application = await this._findAndAuthorize(id, currentUser);
    const currentStatus = application.status;

    // Validate transition
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(newStatus)) {
      const err = new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowedNext.join(', ') || 'none'}`);
      err.statusCode = 400;
      throw err;
    }

    const t = await sequelize.transaction();
    try {
      application.status = newStatus;
      if (notes) {
        application.remarks = notes;
      }

      const history = Array.isArray(application.history) ? [...application.history] : [];
      history.push({
        action: 'STATUS_CHANGED',
        from: currentStatus,
        to: newStatus,
        notes: notes || `Status changed from ${currentStatus} to ${newStatus}`,
        changedBy: currentUser.id,
        changedAt: new Date().toISOString()
      });
      application.history = history;

      // Authoritative financial gate update
      await this.deriveInvoiceEligibility(application, t);

      await application.save({ transaction: t });
      await t.commit();

      // The agent hears about QStudy's review decisions
      if (currentUser.role === 'admin' && ['UnderReview', 'Rejected'].includes(newStatus)) {
        await createNotification({
          recipient: application.agentId,
          title: newStatus === 'UnderReview' ? 'Application under review' : 'Application rejected',
          message: newStatus === 'UnderReview'
            ? `QStudy started reviewing application ${application.applicationNumber}.`
            : `Application ${application.applicationNumber} was rejected.${notes ? ` Reason: ${notes}` : ''}`,
          type: newStatus === 'UnderReview' ? 'info' : 'warning',
          relatedId: application.id,
          relatedModel: 'Application'
        });
      }

      return application.toJSON();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Get application audit history
   */
  async getApplicationHistory(id, currentUser) {
    const application = await this._findAndAuthorize(id, currentUser);
    return Array.isArray(application.history) ? application.history : [];
  }
}

module.exports = new AdmissionTrackingService();
