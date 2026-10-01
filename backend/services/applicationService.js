const { Op } = require('sequelize');
const { Application, Student, University, User, Event, Invoice } = require('../models');
const admissionTrackingService = require('./admissionTrackingService');

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

// Allowed course levels
const ALLOWED_COURSE_LEVELS = [
  'Undergraduate',
  'Postgraduate',
  'Diploma',
  'Doctorate',
  'Certificate'
];

// Standard inclusion of associated models
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

// Generate collision-safe unique application number
const generateApplicationNumber = () => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `APP-${year}-${timestamp}-${random}`;
};

class ApplicationService {
  /**
   * Create a new application
   */
  async createApplication(data, currentUser) {
    const {
      studentId,
      agentId: requestedAgentId,
      universityId,
      sourceEventId,
      courseName,
      courseLevel,
      intakeTerm,
      tuitionFee,
      currency,
      remarks
    } = data;

    // 1. Validate required fields
    if (!studentId) {
      const err = new Error('Student ID is required');
      err.statusCode = 400;
      throw err;
    }
    if (!universityId) {
      const err = new Error('University ID is required');
      err.statusCode = 400;
      throw err;
    }
    if (!courseName || !courseName.trim()) {
      const err = new Error('Course name is required');
      err.statusCode = 400;
      throw err;
    }

    // 2. Validate Student exists
    const student = await Student.findByPk(studentId);
    if (!student) {
      const err = new Error('Student not found');
      err.statusCode = 404;
      throw err;
    }

    // 3. Resolve and validate agent ownership
    let effectiveAgentId;
    if (currentUser.role === 'agent') {
      // For agents, enforce ownership from authenticated token
      effectiveAgentId = currentUser.id;
      if (student.agentId && student.agentId.toString() !== currentUser.id.toString()) {
        const err = new Error('Access denied. You can only create applications for your own students.');
        err.statusCode = 403;
        throw err;
      }
    } else {
      // For admins, allow specifying agentId or default to the student's assigned agent
      effectiveAgentId = requestedAgentId || student.agentId;
      if (!effectiveAgentId) {
        const err = new Error('Agent ID is required');
        err.statusCode = 400;
        throw err;
      }
      const agentUser = await User.findByPk(effectiveAgentId);
      if (!agentUser) {
        const err = new Error('Agent user not found');
        err.statusCode = 404;
        throw err;
      }
    }

    // 4. Validate University exists
    const university = await University.findByPk(universityId);
    if (!university) {
      const err = new Error('University not found');
      err.statusCode = 404;
      throw err;
    }

    // 5. Validate sourceEventId if provided
    let finalSourceEventId = null;
    if (sourceEventId) {
      const event = await Event.findByPk(sourceEventId);
      if (!event) {
        const err = new Error('Source event not found');
        err.statusCode = 404;
        throw err;
      }
      finalSourceEventId = event.id;
    }

    // 6. Validate courseLevel if provided
    if (courseLevel && !ALLOWED_COURSE_LEVELS.includes(courseLevel)) {
      const err = new Error(`Invalid course level. Allowed: ${ALLOWED_COURSE_LEVELS.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    // 7. Validate numeric values
    let numericTuitionFee = null;
    if (tuitionFee !== undefined && tuitionFee !== null && tuitionFee !== '') {
      numericTuitionFee = parseFloat(tuitionFee);
      if (isNaN(numericTuitionFee) || numericTuitionFee < 0) {
        const err = new Error('Tuition fee must be a valid positive number');
        err.statusCode = 400;
        throw err;
      }
    }

    // 8. Generate unique application number
    let applicationNumber = generateApplicationNumber();
    // Ensure uniqueness
    let exists = await Application.findOne({ where: { applicationNumber } });
    while (exists) {
      applicationNumber = generateApplicationNumber();
      exists = await Application.findOne({ where: { applicationNumber } });
    }

    // 9. Initial history entry
    const history = [
      {
        action: 'CREATED',
        from: null,
        to: 'Draft',
        notes: remarks || 'Application created',
        changedBy: currentUser.id,
        changedAt: new Date().toISOString()
      }
    ];

    // 10. Create Application record
    const application = await Application.create({
      applicationNumber,
      studentId: student.id,
      agentId: effectiveAgentId,
      universityId: university.id,
      sourceEventId: finalSourceEventId,
      courseName: courseName.trim(),
      courseLevel: courseLevel || null,
      intakeTerm: intakeTerm ? intakeTerm.trim() : null,
      tuitionFee: numericTuitionFee,
      currency: currency || 'USD',
      status: 'Draft',
      isInvoiceEligible: false,
      remarks: remarks || '',
      history
    });

    // 11. Return created application with associations
    return await this.getApplicationById(application.id, currentUser);
  }

  /**
   * Get applications list with filtering, searching, and pagination
   */
  async getApplications(query = {}, currentUser) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      studentId,
      agentId,
      universityId,
      sourceEventId
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

    // 2. Specific filters
    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        const err = new Error(`Invalid status filter. Allowed: ${ALLOWED_STATUSES.join(', ')}`);
        err.statusCode = 400;
        throw err;
      }
      where.status = status;
    }

    if (studentId) where.studentId = studentId;
    if (universityId) where.universityId = universityId;
    if (sourceEventId) where.sourceEventId = sourceEventId;

    // 3. Search filter
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { applicationNumber: { [Op.iLike]: term } },
        { courseName: { [Op.iLike]: term } },
        { intakeTerm: { [Op.iLike]: term } },
        { '$student.name$': { [Op.iLike]: term } },
        { '$student.email$': { [Op.iLike]: term } },
        { '$university.name$': { [Op.iLike]: term } }
      ];
    }

    const { count, rows } = await Application.findAndCountAll({
      where,
      include: standardIncludes,
      order: [['createdAt', 'DESC']],
      limit: parsedLimit,
      offset,
      distinct: true
    });

    return {
      total: count,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(count / parsedLimit) || 1,
      applications: rows.map(app => app.toJSON())
    };
  }

  /**
   * Get single application by ID
   */
  async getApplicationById(id, currentUser) {
    const application = await Application.findByPk(id, {
      include: standardIncludes
    });

    if (!application) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }

    // Access check for agents
    if (currentUser.role === 'agent' && application.agentId.toString() !== currentUser.id.toString()) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }

    return application.toJSON();
  }

  /**
   * Update application details
   */
  async updateApplication(id, updateData, currentUser) {
    const application = await Application.findByPk(id);

    if (!application) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }

    // Agent ownership check
    if (currentUser.role === 'agent' && application.agentId.toString() !== currentUser.id.toString()) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }

    const {
      universityId,
      sourceEventId,
      courseName,
      courseLevel,
      intakeTerm,
      tuitionFee,
      currency,
      visitDate,
      visitLocation,
      visitNotes,
      visitCompleted,
      offerDate,
      offerLetterUrl,
      offerConditions,
      admissionDate,
      admissionLetterUrl,
      universityStudentId,
      enrollmentDate,
      enrollmentProofUrl,
      depositPaid,
      depositAmount,
      remarks,
      studentId,
      agentId
    } = updateData;

    // Validate universityId if updated
    if (universityId !== undefined) {
      const uni = await University.findByPk(universityId);
      if (!uni) {
        const err = new Error('University not found');
        err.statusCode = 404;
        throw err;
      }
      application.universityId = universityId;
    }

    // Validate sourceEventId if updated
    if (sourceEventId !== undefined) {
      if (sourceEventId) {
        const event = await Event.findByPk(sourceEventId);
        if (!event) {
          const err = new Error('Source event not found');
          err.statusCode = 404;
          throw err;
        }
        application.sourceEventId = sourceEventId;
      } else {
        application.sourceEventId = null;
      }
    }

    // Admin-only reassignment of student or agent
    if (studentId !== undefined) {
      if (currentUser.role !== 'admin') {
        const err = new Error('Only admins can reassign students');
        err.statusCode = 403;
        throw err;
      }
      const st = await Student.findByPk(studentId);
      if (!st) {
        const err = new Error('Student not found');
        err.statusCode = 404;
        throw err;
      }
      application.studentId = studentId;
    }

    if (agentId !== undefined) {
      if (currentUser.role !== 'admin') {
        const err = new Error('Only admins can reassign agents');
        err.statusCode = 403;
        throw err;
      }
      const ag = await User.findByPk(agentId);
      if (!ag) {
        const err = new Error('Agent user not found');
        err.statusCode = 404;
        throw err;
      }
      application.agentId = agentId;
    }

    if (courseName !== undefined) {
      if (!courseName || !courseName.trim()) {
        const err = new Error('Course name cannot be empty');
        err.statusCode = 400;
        throw err;
      }
      application.courseName = courseName.trim();
    }

    if (courseLevel !== undefined) {
      if (courseLevel && !ALLOWED_COURSE_LEVELS.includes(courseLevel)) {
        const err = new Error(`Invalid course level. Allowed: ${ALLOWED_COURSE_LEVELS.join(', ')}`);
        err.statusCode = 400;
        throw err;
      }
      application.courseLevel = courseLevel || null;
    }

    if (intakeTerm !== undefined) application.intakeTerm = intakeTerm;
    if (tuitionFee !== undefined) {
      if (currentUser.role === 'agent' && application.status !== 'Draft') {
        const err = new Error('Access denied. Agents cannot modify tuition fee after application submission.');
        err.statusCode = 403;
        throw err;
      }
      if (tuitionFee === null || tuitionFee === '') {
        application.tuitionFee = null;
      } else {
        const parsed = parseFloat(tuitionFee);
        if (isNaN(parsed) || parsed < 0 || !isFinite(parsed)) {
          const err = new Error('Tuition fee must be a valid positive number');
          err.statusCode = 400;
          throw err;
        }
        application.tuitionFee = parsed;
      }
    }
    if (currency !== undefined) application.currency = currency;

    // Agent authority enforcement: Agents cannot mutate institutional milestone fields or invoice eligibility
    if (currentUser.role === 'agent') {
      const protectedInstitutionalFields = [
        'isInvoiceEligible',
        'depositPaid',
        'depositAmount',
        'admissionDate',
        'admissionLetterUrl',
        'universityStudentId',
        'enrollmentDate',
        'enrollmentProofUrl',
        'visitCompleted',
        'offerDate',
        'offerLetterUrl',
        'offerConditions'
      ];

      for (const field of protectedInstitutionalFields) {
        if (updateData[field] !== undefined) {
          const err = new Error(`Access denied. Agents cannot modify institutional field '${field}'.`);
          err.statusCode = 403;
          throw err;
        }
      }
    }

    // Visit milestone
    if (visitDate !== undefined) application.visitDate = visitDate;
    if (visitLocation !== undefined) application.visitLocation = visitLocation;
    if (visitNotes !== undefined) application.visitNotes = visitNotes;
    if (visitCompleted !== undefined) application.visitCompleted = Boolean(visitCompleted);

    // Offer milestone
    if (offerDate !== undefined) application.offerDate = offerDate;
    if (offerLetterUrl !== undefined) application.offerLetterUrl = offerLetterUrl;
    if (offerConditions !== undefined) application.offerConditions = offerConditions;

    // Admission milestone
    if (admissionDate !== undefined) application.admissionDate = admissionDate;
    if (admissionLetterUrl !== undefined) application.admissionLetterUrl = admissionLetterUrl;
    if (universityStudentId !== undefined) application.universityStudentId = universityStudentId;

    // Enrollment milestone
    if (enrollmentDate !== undefined) application.enrollmentDate = enrollmentDate;
    if (enrollmentProofUrl !== undefined) application.enrollmentProofUrl = enrollmentProofUrl;
    if (depositPaid !== undefined) application.depositPaid = Boolean(depositPaid);
    if (depositAmount !== undefined) {
      const parsed = parseFloat(depositAmount);
      application.depositAmount = isNaN(parsed) ? null : parsed;
    }

    if (remarks !== undefined) application.remarks = remarks;

    // Append to history
    const history = Array.isArray(application.history) ? [...application.history] : [];
    history.push({
      action: 'UPDATED',
      notes: remarks || 'Application updated',
      changedBy: currentUser.id,
      changedAt: new Date().toISOString()
    });
    application.history = history;

    // Authoritative financial gate update
    await admissionTrackingService.deriveInvoiceEligibility(application);

    await application.save();

    return await this.getApplicationById(application.id, currentUser);
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(id, newStatus, remarks, currentUser) {
    if (!newStatus || !ALLOWED_STATUSES.includes(newStatus)) {
      const err = new Error(`Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const application = await Application.findByPk(id);

    if (!application) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }

    // Agent ownership check & role-based status restriction
    if (currentUser.role === 'agent') {
      if (application.agentId.toString() !== currentUser.id.toString()) {
        const err = new Error('Access denied');
        err.statusCode = 403;
        throw err;
      }

      // Agents can only submit a draft application or withdraw
      const agentAllowedStatuses = ['Submitted', 'Withdrawn'];
      if (!agentAllowedStatuses.includes(newStatus)) {
        const err = new Error(`Access denied. Agents cannot set application status to '${newStatus}'.`);
        err.statusCode = 403;
        throw err;
      }
      if (newStatus === 'Submitted' && application.status !== 'Draft') {
        const err = new Error(`Cannot submit application that is currently '${application.status}'`);
        err.statusCode = 400;
        throw err;
      }
    }

    const oldStatus = application.status;
    application.status = newStatus;

    if (remarks) {
      application.remarks = remarks;
    }

    // Append history
    const history = Array.isArray(application.history) ? [...application.history] : [];
    history.push({
      action: 'STATUS_CHANGED',
      from: oldStatus,
      to: newStatus,
      notes: remarks || `Status changed from ${oldStatus} to ${newStatus}`,
      changedBy: currentUser.id,
      changedAt: new Date().toISOString()
    });
    application.history = history;

    // Authoritative financial gate update
    await admissionTrackingService.deriveInvoiceEligibility(application);

    await application.save();

    return await this.getApplicationById(application.id, currentUser);
  }

  /**
   * Delete application
   */
  async deleteApplication(id, currentUser) {
    const application = await Application.findByPk(id);

    if (!application) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }

    // Authorization check
    if (currentUser.role === 'agent') {
      if (application.agentId.toString() !== currentUser.id.toString()) {
        const err = new Error('Access denied');
        err.statusCode = 403;
        throw err;
      }
      if (application.status !== 'Draft') {
        const err = new Error('Agents can only delete applications in Draft status');
        err.statusCode = 400;
        throw err;
      }
    }

    // Check if application is associated with an active invoice
    if (application.isInvoiced || application.invoiceId) {
      const err = new Error('Cannot delete an application that has been invoiced');
      err.statusCode = 400;
      throw err;
    }

    await application.destroy();

    return {
      success: true,
      detail: 'Application deleted successfully'
    };
  }

  /**
   * Get applications for a specific Student
   */
  async getApplicationsByStudent(studentId, currentUser) {
    const student = await Student.findByPk(studentId);
    if (!student) {
      const err = new Error('Student not found');
      err.statusCode = 404;
      throw err;
    }

    if (currentUser.role === 'agent' && student.agentId.toString() !== currentUser.id.toString()) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }

    return await this.getApplications({ studentId }, currentUser);
  }

  /**
   * Get applications for a specific University
   */
  async getApplicationsByUniversity(universityId, currentUser) {
    const university = await University.findByPk(universityId);
    if (!university) {
      const err = new Error('University not found');
      err.statusCode = 404;
      throw err;
    }

    return await this.getApplications({ universityId }, currentUser);
  }

  /**
   * Get applications for a specific Agent
   */
  async getApplicationsByAgent(agentId, currentUser) {
    if (currentUser.role === 'agent' && agentId.toString() !== currentUser.id.toString()) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }

    const agent = await User.findByPk(agentId);
    if (!agent) {
      const err = new Error('Agent not found');
      err.statusCode = 404;
      throw err;
    }

    return await this.getApplications({ agentId }, currentUser);
  }
}

module.exports = new ApplicationService();
