const { Op } = require('sequelize');
const { Student, User, Application, Course, University } = require('../models');
const { deleteObject } = require('../utils/storage');
const applicationService = require('./applicationService');
const { scopeWhereToAgents, assertCanAccessAgent } = require('../utils/agentScope');
const { getStudentProgress } = require('../utils/visaPipeline');

// A student has no status of their own: their progress is the furthest visa stage among their applications
const withProgress = (student) => {
  const json = student.toJSON();
  const applications = Array.isArray(json.applications) ? json.applications : [];
  return { ...json, applicationCount: applications.length, ...getStudentProgress(applications) };
};

const standardIncludes = [
  {
    model: User,
    as: 'agent',
    attributes: ['id', 'name', 'email', 'role', 'agencyName', 'phone']
  },
  {
    model: Application,
    as: 'applications',
    attributes: ['id', 'applicationNumber', 'courseName', 'courseLevel', 'intakeTerm', 'status', 'pipelineStage', 'feeStatus', 'isInvoiceEligible']
  }
];

// A course is usable for a university if it is listed for it or open to every university
const offeredBy = (course, universityId) => {
  const ids = course.toJSON().universityIds;
  return ids.length === 0 || ids.includes(String(universityId));
};

// A programme code the way universities write them: the university code, a level letter,
// the initials of the course name and a number, e.g. "UM-BCS101". Unique within the university.
const LEVEL_LETTERS = { Foundation: 'F', Certificate: 'C', Diploma: 'D', Undergraduate: 'B', Postgraduate: 'M', Masters: 'M', PhD: 'P', Doctorate: 'P' };
const generateCourseCode = async (university, name, level) => {
  const stop = new Set(['of', 'in', 'and', 'the', 'for', 'with', 'to']);
  const initials = name.split(/[^A-Za-z0-9]+/).filter(w => w && !stop.has(w.toLowerCase()))
    .map(w => w[0].toUpperCase()).join('').slice(0, 3).padEnd(2, 'X');
  const prefix = `${university.code ? `${String(university.code).toUpperCase()}-` : ''}${LEVEL_LETTERS[level] || 'B'}${initials}`;
  const taken = new Set((await Course.findAll({ attributes: ['code'] })).map(c => String(c.code || '').toUpperCase()));
  for (let n = 101; n < 1000; n += 1) {
    if (!taken.has(`${prefix}${n}`)) return `${prefix}${n}`;
  }
  return `${prefix}${Date.now().toString().slice(-4)}`;
};

// The university's course for an application: the chosen one if the university offers it, else one with the
// same name, else a new course (with a generated code) added to the university's catalog
const resolveCourseForUniversity = async (university, { courseId, courseName }) => {
  if (courseId) {
    const chosen = await Course.findByPk(courseId);
    if (chosen && chosen.status === 'active' && offeredBy(chosen, university.id)) return chosen;
  }
  const name = String(courseName || (courseId && (await Course.findByPk(courseId))?.name) || '').trim();
  if (!name) return null;
  const sameName = await Course.findAll({ where: { name: { [Op.iLike]: name.replace(/[\\%_]/g, (ch) => `\\${ch}`) }, status: 'active' } });
  const match = sameName.find(c => offeredBy(c, university.id));
  if (match) return match;
  return Course.create({
    name,
    code: await generateCourseCode(university, name, 'Undergraduate'),
    level: 'Undergraduate',
    universityId: university.id,
    universityIds: [university.id],
    status: 'active'
  });
};

class StudentService {
  /**
   * Create a new Student (direct registration)
   */
  async createStudent(data, currentUser) {
    const {
      agentId: requestedAgentId,
      customFields,
      name,
      email,
      phone,
      country,
      education,
      courseInterested,
      notes
    } = data;

    // 1. Resolve agent ownership
    let effectiveAgentId;
    if (currentUser.role === 'agent') {
      // Enforce agent ownership strictly from token - prevent spoofing
      effectiveAgentId = currentUser.id;
    } else {
      // For Admin, allow specifying agent or default to admin
      effectiveAgentId = requestedAgentId || currentUser.id;
      if (requestedAgentId) await assertCanAccessAgent(currentUser, requestedAgentId);
      const agentUser = await User.findByPk(effectiveAgentId);
      if (!agentUser) {
        const err = new Error('Agent user not found');
        err.statusCode = 404;
        throw err;
      }
    }

    // 3. Prepare student data
    const studentData = {
      agentId: effectiveAgentId,
      customFields: customFields && typeof customFields === 'object' ? customFields : {},
      documents: []
    };

    if (name) studentData.name = name.trim();
    if (email) studentData.email = email.toLowerCase().trim();
    if (phone) studentData.phone = phone.trim();
    // Every student studies in Malaysia
    studentData.country = country ? country.trim() : 'Malaysia';
    if (education) studentData.education = education.trim();
    if (courseInterested) studentData.courseInterested = courseInterested.trim();
    if (notes) studentData.notes = notes;

    const student = await Student.create(studentData);

    // Only confirmed applications are registered, so the student goes straight into an application
    // for the chosen university and course (submitted, not left as a draft)
    let applicationWarning = null;
    const cf = studentData.customFields;
    if (cf.universityId) {
      try {
        const university = await University.findByPk(cf.universityId);
        if (!university) {
          applicationWarning = 'The student was registered, but no application was created because the university was not found.';
        } else {
          const course = await resolveCourseForUniversity(university, { courseId: cf.courseId, courseName: courseInterested });
          if (!course) {
            applicationWarning = 'The student was registered, but no application was created because no course was given.';
          } else {
            const application = await applicationService.createApplication(
              { studentId: student.id, agentId: effectiveAgentId, universityId: university.id, courseId: course.id },
              currentUser
            );
            await applicationService.updateApplicationStatus(application.id, 'Submitted', 'Submitted at student registration', currentUser);
          }
        }
      } catch (err) {
        console.error('Auto-create application error:', err);
        applicationWarning = `The student was registered, but the application could not be created: ${err.message}`;
      }
    }

    const created = await this.getStudentById(student.id, currentUser);
    return applicationWarning ? { ...created, applicationWarning } : created;
  }

  /**
   * Get students with search, filter, and pagination
   */
  async getStudents(query = {}, currentUser) {
    const {
      page = 1,
      limit = 20,
      search,
      agentId
    } = query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (parsedPage - 1) * parsedLimit;

    const where = {};

    // 1. Agent ownership isolation: Agents only see their own students
    if (currentUser.role === 'agent') {
      where.agentId = currentUser.id;
    } else if (agentId) {
      where.agentId = agentId;
    }
    // Account Managers only see students of their own agents
    await scopeWhereToAgents(where, currentUser);

    // 2. Search filter
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } },
        { phone: { [Op.iLike]: term } },
        { country: { [Op.iLike]: term } },
        { courseInterested: { [Op.iLike]: term } }
      ];
    }

    const { count, rows } = await Student.findAndCountAll({
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
          attributes: ['id', 'status', 'pipelineStage', 'feeStatus'],
          required: false
        }
      ],
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
      students: rows.map(withProgress)
    };
  }

  /**
   * Get single student by ID
   */
  async getStudentById(id, currentUser) {
    const student = await Student.findByPk(id, {
      include: standardIncludes
    });

    if (!student) {
      const err = new Error('Student not found');
      err.statusCode = 404;
      throw err;
    }

    // Agent ownership check
    if (currentUser.role === 'agent' && student.agentId.toString() !== currentUser.id.toString()) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }
    await assertCanAccessAgent(currentUser, student.agentId);

    return withProgress(student);
  }

  /**
   * Update student details
   */
  async updateStudent(id, updateData, currentUser) {
    const student = await Student.findByPk(id);

    if (!student) {
      const err = new Error('Student not found');
      err.statusCode = 404;
      throw err;
    }

    // Agent ownership check
    if (currentUser.role === 'agent' && student.agentId.toString() !== currentUser.id.toString()) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }
    await assertCanAccessAgent(currentUser, student.agentId);

    const {
      agentId,
      customFields,
      name,
      email,
      phone,
      country,
      education,
      courseInterested,
      notes
    } = updateData;

    // Agent cannot transfer student ownership
    if (agentId !== undefined && currentUser.role === 'agent' && agentId.toString() !== currentUser.id.toString()) {
      const err = new Error('Agents cannot transfer student ownership');
      err.statusCode = 403;
      throw err;
    }

    // Admin can reassign agent if requested
    if (agentId !== undefined && currentUser.role === 'admin') {
      await assertCanAccessAgent(currentUser, agentId);
      const agentUser = await User.findByPk(agentId);
      if (!agentUser) {
        const err = new Error('Agent user not found');
        err.statusCode = 404;
        throw err;
      }
      student.agentId = agentId;
    }

    if (customFields && typeof customFields === 'object') {
      student.customFields = customFields;
    }

    if (name !== undefined) student.name = name.trim();
    if (email !== undefined) student.email = email.toLowerCase().trim();
    if (phone !== undefined) student.phone = phone.trim();
    if (country !== undefined) student.country = country.trim();
    if (education !== undefined) student.education = education.trim();
    if (courseInterested !== undefined) student.courseInterested = courseInterested.trim();
    if (notes !== undefined) student.notes = notes;

    await student.save();

    return await this.getStudentById(student.id, currentUser);
  }

  /**
   * Delete student
   */
  async deleteStudent(id, currentUser) {
    const student = await Student.findByPk(id);

    if (!student) {
      const err = new Error('Student not found');
      err.statusCode = 404;
      throw err;
    }

    // Ownership check: Agent can only delete their own students
    if (currentUser.role === 'agent' && student.agentId.toString() !== currentUser.id.toString()) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }
    await assertCanAccessAgent(currentUser, student.agentId);

    // Clean up uploaded documents from storage
    if (student.documents && student.documents.length > 0) {
      for (const doc of student.documents) {
        try {
          if (doc.storagePath) {
            await deleteObject(doc.storagePath);
          }
        } catch (error) {
          console.error(`Failed to delete document ${doc.id}:`, error);
        }
      }
    }

    await student.destroy();

    return {
      success: true,
      detail: 'Student deleted successfully'
    };
  }

  /**
   * Get applications belonging to a Student (with agent isolation)
   */
  async getStudentApplications(studentId, query, currentUser) {
    const student = await Student.findByPk(studentId);

    if (!student) {
      const err = new Error('Student not found');
      err.statusCode = 404;
      throw err;
    }

    // Agent ownership check: Agent can only see applications for their own students
    if (currentUser.role === 'agent' && student.agentId.toString() !== currentUser.id.toString()) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }
    await assertCanAccessAgent(currentUser, student.agentId);

    // Delegate to applicationService with studentId filter
    return await applicationService.getApplications({ ...query, studentId }, currentUser);
  }
}

module.exports = new StudentService();
