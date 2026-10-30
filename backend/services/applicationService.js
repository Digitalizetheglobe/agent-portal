const { Op } = require('sequelize');
const { Application, Student, University, User, Invoice, Course } = require('../models');
const { parseCourseTuitionFee } = require('../utils/tuitionUtils');
const admissionTrackingService = require('./admissionTrackingService');
const { scopeWhereToAgents, assertCanAccessAgent } = require('../utils/agentScope');
const { assertCanAccessUniversity } = require('../utils/universityAccess');
const { STAGES } = require('../utils/visaPipeline');

// Allowed status enum values
const ALLOWED_STATUSES = [
  'Draft',
  'Submitted',
  'UnderReview',
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

// Generate collision-safe unique application number
const generateApplicationNumber = () => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `APP-${year}-${timestamp}-${random}`;
};

/**
 * Resolve a catalog course for an application. The course must be active and
 * offered by the given university (or be open to all universities).
 * Returns the application fields derived from the course.
 */
const resolveCatalogCourse = async (courseId, universityId) => {
  const course = await Course.findByPk(courseId);
  if (!course) {
    const err = new Error('Course not found');
    err.statusCode = 404;
    throw err;
  }
  if (course.status !== 'active') {
    const err = new Error('Selected course is not active');
    err.statusCode = 400;
    throw err;
  }
  const { universityIds } = course.toJSON();
  const isOpenToAll = !universityIds.length;
  if (!isOpenToAll && !universityIds.includes(String(universityId))) {
    const err = new Error('Selected course is not offered by the selected university');
    err.statusCode = 400;
    throw err;
  }
  return {
    courseId: course.id,
    courseName: course.name,
    courseLevel: ALLOWED_COURSE_LEVELS.includes(course.level) ? course.level : null,
    tuitionFee: parseCourseTuitionFee(course.tuitionFee)
  };
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
      courseId,
      intakeTerm,
      tuitionFee,
      currency,
      remarks
    } = data;
    let { courseName, courseLevel } = data;

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
    if (!courseId) {
      const err = new Error('Course ID is required. Select a course from the university catalog.');
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
      await assertCanAccessAgent(currentUser, student.agentId);
      if (requestedAgentId) await assertCanAccessAgent(currentUser, requestedAgentId);
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

    // 4a. Agents can only submit to universities they are authorised for
    if (currentUser.role === 'agent') assertCanAccessUniversity(currentUser, university);

    // 4b. Course comes from the catalog; name, level and tuition are derived from it
    const catalogCourse = await resolveCatalogCourse(courseId, university.id);
    courseName = catalogCourse.courseName;
    courseLevel = catalogCourse.courseLevel;

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

    // Catalog tuition is only a default; a fee supplied by the user overrides it
    if (numericTuitionFee === null && catalogCourse.tuitionFee !== null) {
      numericTuitionFee = catalogCourse.tuitionFee;
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
      courseId: catalogCourse.courseId,
      courseName,
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
      pipelineStage,
      studentId,
      agentId,
      universityId,
      courseId
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
    // Account Managers only see applications of their own agents
    await scopeWhereToAgents(where, currentUser);

    // 2. Specific filters
    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        const err = new Error(`Invalid status filter. Allowed: ${ALLOWED_STATUSES.join(', ')}`);
        err.statusCode = 400;
        throw err;
      }
      where.status = status;
    }

    // The visa pipeline stage the application is at
    if (pipelineStage) {
      if (!STAGES.includes(pipelineStage)) {
        const err = new Error(`Invalid stage filter. Allowed: ${STAGES.join(', ')}`);
        err.statusCode = 400;
        throw err;
      }
      where.pipelineStage = pipelineStage;
    }

    if (studentId) where.studentId = studentId;
    if (universityId) where.universityId = universityId;
    if (courseId) where.courseId = courseId;

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
    await assertCanAccessAgent(currentUser, application.agentId);

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
    await assertCanAccessAgent(currentUser, application.agentId);

    const {
      universityId,
      courseId,
      courseName,
      courseLevel,
      intakeTerm,
      tuitionFee,
      currency,
      remarks,
      studentId,
      agentId
    } = updateData;

    // Validate universityId if updated
    const universityChanged = universityId !== undefined && String(universityId) !== String(application.universityId);
    if (universityId !== undefined) {
      const uni = await University.findByPk(universityId);
      if (!uni) {
        const err = new Error('University not found');
        err.statusCode = 404;
        throw err;
      }
      if (universityChanged && currentUser.role === 'agent') assertCanAccessUniversity(currentUser, uni);
      application.universityId = universityId;
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
      await assertCanAccessAgent(currentUser, st.agentId);
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
      await assertCanAccessAgent(currentUser, agentId);
      application.agentId = agentId;
    }

    // Catalog course: re-resolve when the course changes, or when the university
    // changes on an application that is already bound to a catalog course.
    const courseChanged = courseId !== undefined && String(courseId) !== String(application.courseId);
    const effectiveCourseId = courseId !== undefined ? courseId : application.courseId;
    if (courseId !== undefined && !courseId) {
      const err = new Error('Course ID cannot be empty. Select a course from the university catalog.');
      err.statusCode = 400;
      throw err;
    }
    if (effectiveCourseId && (courseChanged || universityChanged)) {
      const derived = await resolveCatalogCourse(effectiveCourseId, application.universityId);
      application.courseId = derived.courseId;
      application.courseName = derived.courseName;
      application.courseLevel = derived.courseLevel;
      if (courseChanged && derived.tuitionFee !== null) {
        application.tuitionFee = derived.tuitionFee;
      }
    }

    // Catalog-bound applications take name/level from the course, not from the client
    const isCatalogBound = Boolean(application.courseId);

    if (courseName !== undefined && !isCatalogBound) {
      if (!courseName || !courseName.trim()) {
        const err = new Error('Course name cannot be empty');
        err.statusCode = 400;
        throw err;
      }
      application.courseName = courseName.trim();
    }

    if (courseLevel !== undefined && !isCatalogBound) {
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

    // Agent authority enforcement: Agents cannot change invoice eligibility or the visa pipeline
    if (currentUser.role === 'agent') {
      const protectedInstitutionalFields = [
        'isInvoiceEligible',
        'pipelineStage',
        'feeStatus'
      ];

      for (const field of protectedInstitutionalFields) {
        if (updateData[field] !== undefined) {
          const err = new Error(`Access denied. Agents cannot modify institutional field '${field}'.`);
          err.statusCode = 403;
          throw err;
        }
      }
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
    await assertCanAccessAgent(currentUser, application.agentId);

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

    await assertCanAccessAgent(currentUser, application.agentId);

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

    await assertCanAccessAgent(currentUser, student.agentId);

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

    await assertCanAccessAgent(currentUser, agentId);

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
