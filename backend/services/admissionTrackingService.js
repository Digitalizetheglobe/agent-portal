const { sequelize } = require('../config/db');
const { Application, Student, University, User, Event, Invoice } = require('../models');

// Allowed status enum values
const ALLOWED_STATUSES = [
  'Draft',
  'Submitted',
  'UnderReview',
  'VisitScheduled',
  'VisitCompleted',
  'OfferReceived',
  'ConditionalOffer',
  'AdmissionConfirmed',
  'Enrolled',
  'Rejected',
  'Withdrawn'
];

// Workflow transition map
const ALLOWED_TRANSITIONS = {
  Draft: ['Submitted', 'Withdrawn'],
  Submitted: ['UnderReview', 'Withdrawn'],
  UnderReview: ['VisitScheduled', 'OfferReceived', 'ConditionalOffer', 'Rejected', 'Withdrawn'],
  VisitScheduled: ['VisitCompleted', 'Withdrawn'],
  VisitCompleted: ['OfferReceived', 'ConditionalOffer', 'Rejected', 'Withdrawn'],
  OfferReceived: ['AdmissionConfirmed', 'Withdrawn', 'Rejected'],
  ConditionalOffer: ['AdmissionConfirmed', 'Rejected', 'Withdrawn'],
  AdmissionConfirmed: ['Enrolled', 'Withdrawn'],
  Enrolled: [],
  Rejected: [],
  Withdrawn: []
};

// Standard inclusions for application queries
const standardIncludes = [
  {
    model: Student,
    as: 'student',
    attributes: ['id', 'name', 'email', 'phone', 'country', 'education', 'status']
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
    model: Event,
    as: 'sourceEvent',
    attributes: ['id', 'title', 'date', 'location', 'type']
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

    return application;
  }

  /**
   * Authoritatively derive invoice eligibility based on the 4 institutional pillars:
   * 1. Verified Admission (admissionDate exists)
   * 2. Verified Deposit (depositPaid is true)
   * 3. Verified Student (linked student has verificationStatus === 'Verified')
   * 4. Institutional Matriculation (status === 'Enrolled' && enrollmentDate exists)
   */
  async deriveInvoiceEligibility(application, transaction = null) {
    let student = application.student;
    if (!student || !student.verificationStatus) {
      student = await Student.findByPk(application.studentId, { transaction });
    }

    const isAdmissionVerified = Boolean(application.admissionDate);
    const isDepositVerified = Boolean(application.depositPaid);
    const isStudentVerified = student ? student.verificationStatus === 'Verified' : false;
    const isEnrollmentVerified = application.status === 'Enrolled' && Boolean(application.enrollmentDate);

    const eligible = isAdmissionVerified && isDepositVerified && isStudentVerified && isEnrollmentVerified;
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

      return application.toJSON();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Schedule university campus visit
   */
  async scheduleVisit(id, { visitDate, visitLocation, visitNotes }, currentUser) {
    const application = await this._findAndAuthorize(id, currentUser);

    if (application.status === 'Rejected' || application.status === 'Withdrawn' || application.status === 'Enrolled') {
      const err = new Error(`Cannot schedule visit for application with status '${application.status}'`);
      err.statusCode = 400;
      throw err;
    }

    if (visitDate) {
      const date = new Date(visitDate);
      if (isNaN(date.getTime())) {
        const err = new Error('Invalid visitDate format');
        err.statusCode = 400;
        throw err;
      }
    }

    const t = await sequelize.transaction();
    try {
      const oldStatus = application.status;
      application.visitDate = visitDate ? new Date(visitDate) : new Date();
      if (visitLocation !== undefined) application.visitLocation = visitLocation;
      if (visitNotes !== undefined) application.visitNotes = visitNotes;
      application.visitCompleted = false;
      application.status = 'VisitScheduled';

      const history = Array.isArray(application.history) ? [...application.history] : [];
      history.push({
        action: 'VISIT_SCHEDULED',
        from: oldStatus,
        to: 'VisitScheduled',
        notes: visitNotes || 'Campus visit scheduled',
        changedBy: currentUser.id,
        changedAt: new Date().toISOString()
      });
      application.history = history;

      await application.save({ transaction: t });
      await t.commit();

      return application.toJSON();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Mark scheduled visit as completed
   */
  async completeVisit(id, { visitNotes }, currentUser) {
    if (currentUser.role !== 'admin') {
      const err = new Error('Access denied. Completing campus visits is restricted to admin.');
      err.statusCode = 403;
      throw err;
    }

    const application = await this._findAndAuthorize(id, currentUser);

    if (!application.visitDate) {
      const err = new Error('Cannot complete a visit that was never scheduled');
      err.statusCode = 400;
      throw err;
    }

    const t = await sequelize.transaction();
    try {
      const oldStatus = application.status;
      application.visitCompleted = true;
      application.status = 'VisitCompleted';
      if (visitNotes !== undefined) application.visitNotes = visitNotes;

      const history = Array.isArray(application.history) ? [...application.history] : [];
      history.push({
        action: 'VISIT_COMPLETED',
        from: oldStatus,
        to: 'VisitCompleted',
        notes: visitNotes || 'Campus visit completed',
        changedBy: currentUser.id,
        changedAt: new Date().toISOString()
      });
      application.history = history;

      await application.save({ transaction: t });
      await t.commit();

      return application.toJSON();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Record unconditional offer
   */
  async recordOffer(id, { offerDate, offerLetterUrl, offerConditions }, currentUser) {
    if (currentUser.role !== 'admin') {
      const err = new Error('Access denied. Recording offers is restricted to admin.');
      err.statusCode = 403;
      throw err;
    }

    const application = await this._findAndAuthorize(id, currentUser);

    if (application.status === 'Rejected' || application.status === 'Withdrawn') {
      const err = new Error(`Cannot record offer for an application with status '${application.status}'`);
      err.statusCode = 400;
      throw err;
    }

    if (offerDate) {
      const date = new Date(offerDate);
      if (isNaN(date.getTime())) {
        const err = new Error('Invalid offerDate format');
        err.statusCode = 400;
        throw err;
      }
    }

    const t = await sequelize.transaction();
    try {
      const oldStatus = application.status;
      application.offerDate = offerDate ? new Date(offerDate) : new Date();
      if (offerLetterUrl !== undefined) application.offerLetterUrl = offerLetterUrl;
      if (offerConditions !== undefined) application.offerConditions = offerConditions;
      application.status = 'OfferReceived';

      const history = Array.isArray(application.history) ? [...application.history] : [];
      history.push({
        action: 'OFFER_RECEIVED',
        from: oldStatus,
        to: 'OfferReceived',
        notes: offerConditions || 'Offer letter received',
        changedBy: currentUser.id,
        changedAt: new Date().toISOString()
      });
      application.history = history;

      await application.save({ transaction: t });
      await t.commit();

      return application.toJSON();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Record conditional offer
   */
  async recordConditionalOffer(id, { offerDate, offerLetterUrl, offerConditions }, currentUser) {
    if (currentUser.role !== 'admin') {
      const err = new Error('Access denied. Recording conditional offers is restricted to admin.');
      err.statusCode = 403;
      throw err;
    }

    const application = await this._findAndAuthorize(id, currentUser);

    if (application.status === 'Rejected' || application.status === 'Withdrawn') {
      const err = new Error(`Cannot record conditional offer for an application with status '${application.status}'`);
      err.statusCode = 400;
      throw err;
    }

    if (offerDate) {
      const date = new Date(offerDate);
      if (isNaN(date.getTime())) {
        const err = new Error('Invalid offerDate format');
        err.statusCode = 400;
        throw err;
      }
    }

    const t = await sequelize.transaction();
    try {
      const oldStatus = application.status;
      application.offerDate = offerDate ? new Date(offerDate) : new Date();
      if (offerLetterUrl !== undefined) application.offerLetterUrl = offerLetterUrl;
      if (offerConditions !== undefined) application.offerConditions = offerConditions;
      application.status = 'ConditionalOffer';

      const history = Array.isArray(application.history) ? [...application.history] : [];
      history.push({
        action: 'CONDITIONAL_OFFER_RECEIVED',
        from: oldStatus,
        to: 'ConditionalOffer',
        notes: offerConditions || 'Conditional offer received',
        changedBy: currentUser.id,
        changedAt: new Date().toISOString()
      });
      application.history = history;

      await application.save({ transaction: t });
      await t.commit();

      return application.toJSON();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Confirm student admission
   */
  async confirmAdmission(id, { admissionDate, admissionLetterUrl, universityStudentId, tuitionFee }, currentUser) {
    if (currentUser.role !== 'admin') {
      const err = new Error('Access denied. Admission confirmation is restricted to admin.');
      err.statusCode = 403;
      throw err;
    }

    const application = await this._findAndAuthorize(id, currentUser);

    const allowedStages = ['OfferReceived', 'ConditionalOffer', 'AdmissionConfirmed'];
    if (!allowedStages.includes(application.status)) {
      const err = new Error(`Cannot confirm admission before an offer has been received. Current status: '${application.status}'`);
      err.statusCode = 400;
      throw err;
    }

    if (admissionDate) {
      const date = new Date(admissionDate);
      if (isNaN(date.getTime())) {
        const err = new Error('Invalid admissionDate format');
        err.statusCode = 400;
        throw err;
      }
    }

    let verifiedTuition = undefined;
    if (tuitionFee !== undefined && tuitionFee !== null && tuitionFee !== '') {
      const parsed = parseFloat(tuitionFee);
      if (isNaN(parsed) || parsed <= 0 || !isFinite(parsed)) {
        const err = new Error('Confirmed tuition fee must be a valid positive number');
        err.statusCode = 400;
        throw err;
      }
      verifiedTuition = parsed;
    }

    const t = await sequelize.transaction();
    try {
      const oldStatus = application.status;
      application.admissionDate = admissionDate ? new Date(admissionDate) : new Date();
      if (admissionLetterUrl !== undefined) application.admissionLetterUrl = admissionLetterUrl;
      if (universityStudentId !== undefined) application.universityStudentId = universityStudentId;
      if (verifiedTuition !== undefined) application.tuitionFee = verifiedTuition;
      application.status = 'AdmissionConfirmed';

      const history = Array.isArray(application.history) ? [...application.history] : [];
      const tuitionNote = verifiedTuition !== undefined ? ` | Confirmed Tuition: $${verifiedTuition}` : '';
      history.push({
        action: 'ADMISSION_CONFIRMED',
        from: oldStatus,
        to: 'AdmissionConfirmed',
        notes: `Admission confirmed. University Student ID: ${universityStudentId || 'N/A'}${tuitionNote}`,
        changedBy: currentUser.id,
        changedAt: new Date().toISOString()
      });
      application.history = history;

      // Authoritative financial gate update
      await this.deriveInvoiceEligibility(application, t);

      await application.save({ transaction: t });
      await t.commit();

      return application.toJSON();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Record student enrollment
   */
  async recordEnrollment(id, { enrollmentDate, enrollmentProofUrl }, currentUser) {
    if (currentUser.role !== 'admin') {
      const err = new Error('Access denied. Enrollment confirmation is restricted to admin.');
      err.statusCode = 403;
      throw err;
    }

    const application = await this._findAndAuthorize(id, currentUser);

    if (application.status !== 'AdmissionConfirmed' && application.status !== 'Enrolled') {
      const err = new Error(`Cannot enroll application before admission is confirmed. Current status: '${application.status}'`);
      err.statusCode = 400;
      throw err;
    }

    if (enrollmentDate) {
      const date = new Date(enrollmentDate);
      if (isNaN(date.getTime())) {
        const err = new Error('Invalid enrollmentDate format');
        err.statusCode = 400;
        throw err;
      }
    }

    const t = await sequelize.transaction();
    try {
      const oldStatus = application.status;
      application.enrollmentDate = enrollmentDate ? new Date(enrollmentDate) : new Date();
      if (enrollmentProofUrl !== undefined) application.enrollmentProofUrl = enrollmentProofUrl;
      application.status = 'Enrolled';

      const history = Array.isArray(application.history) ? [...application.history] : [];
      history.push({
        action: 'ENROLLED',
        from: oldStatus,
        to: 'Enrolled',
        notes: 'Student enrollment recorded',
        changedBy: currentUser.id,
        changedAt: new Date().toISOString()
      });
      application.history = history;

      // Authoritative financial gate update
      await this.deriveInvoiceEligibility(application, t);

      await application.save({ transaction: t });
      await t.commit();

      return application.toJSON();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Update deposit information
   */
  async updateDeposit(id, { depositPaid, depositAmount }, currentUser) {
    if (currentUser.role !== 'admin') {
      const err = new Error('Access denied. Deposit verification is restricted to admin.');
      err.statusCode = 403;
      throw err;
    }

    const application = await this._findAndAuthorize(id, currentUser);

    if (depositAmount !== undefined && depositAmount !== null && depositAmount !== '') {
      const parsed = parseFloat(depositAmount);
      if (isNaN(parsed) || parsed < 0) {
        const err = new Error('Deposit amount must be a valid number greater than or equal to 0');
        err.statusCode = 400;
        throw err;
      }
    }

    const t = await sequelize.transaction();
    try {
      if (depositPaid !== undefined) {
        application.depositPaid = Boolean(depositPaid);
      }
      if (depositAmount !== undefined && depositAmount !== null && depositAmount !== '') {
        application.depositAmount = parseFloat(depositAmount);
      }

      const history = Array.isArray(application.history) ? [...application.history] : [];
      history.push({
        action: 'DEPOSIT_UPDATED',
        notes: `Deposit updated: paid=${application.depositPaid}, amount=${application.depositAmount}`,
        changedBy: currentUser.id,
        changedAt: new Date().toISOString()
      });
      application.history = history;

      // Authoritative financial gate update
      await this.deriveInvoiceEligibility(application, t);

      await application.save({ transaction: t });
      await t.commit();

      return application.toJSON();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Get application tracking detail with all milestones and relationships
   */
  async getTrackingDetail(id, currentUser) {
    const application = await this._findAndAuthorize(id, currentUser);
    const appJson = application.toJSON();

    return {
      ...appJson,
      tracking: {
        currentStatus: application.status,
        visit: {
          visitDate: application.visitDate,
          visitLocation: application.visitLocation,
          visitNotes: application.visitNotes,
          visitCompleted: application.visitCompleted
        },
        offer: {
          offerDate: application.offerDate,
          offerLetterUrl: application.offerLetterUrl,
          offerConditions: application.offerConditions
        },
        admission: {
          admissionDate: application.admissionDate,
          admissionLetterUrl: application.admissionLetterUrl,
          universityStudentId: application.universityStudentId
        },
        enrollment: {
          enrollmentDate: application.enrollmentDate,
          enrollmentProofUrl: application.enrollmentProofUrl
        },
        deposit: {
          depositPaid: application.depositPaid,
          depositAmount: application.depositAmount
        },
        invoice: {
          isInvoiceEligible: application.isInvoiceEligible,
          isInvoiced: application.isInvoiced,
          invoiceId: application.invoiceId
        }
      }
    };
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
