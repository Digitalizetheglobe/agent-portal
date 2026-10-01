const { Op } = require('sequelize');
const { Student, Event, User, Application } = require('../models');
const { sendEmail, templates } = require('../utils/email');
const { deleteObject } = require('../utils/storage');
const applicationService = require('./applicationService');

const ALLOWED_STATUSES = ['Registered', 'Contacted', 'Confirmed', 'Attended', 'Converted'];

const standardIncludes = [
  {
    model: User,
    as: 'agent',
    attributes: ['id', 'name', 'email', 'role', 'agencyName', 'phone']
  },
  {
    model: Event,
    as: 'event',
    attributes: ['id', 'title', 'date', 'location', 'type']
  },
  {
    model: Application,
    as: 'applications',
    attributes: ['id', 'applicationNumber', 'courseName', 'courseLevel', 'intakeTerm', 'status', 'isInvoiceEligible']
  }
];

class StudentService {
  /**
   * Create a new Student (Direct or Event-linked)
   */
  async createStudent(data, currentUser) {
    const {
      eventId,
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
      const agentUser = await User.findByPk(effectiveAgentId);
      if (!agentUser) {
        const err = new Error('Agent user not found');
        err.statusCode = 404;
        throw err;
      }
    }

    // 2. Event validation & capacity management if eventId is supplied
    let event = null;
    let finalEventId = null;

    if (eventId) {
      event = await Event.findByPk(eventId);
      if (!event) {
        const err = new Error('Event not found');
        err.statusCode = 404;
        throw err;
      }
      finalEventId = event.id;

      // Check agent assignment to event if role is agent
      if (currentUser.role === 'agent') {
        const assigned = Array.isArray(event.assignedAgents) ? event.assignedAgents : [];
        const hasAccess = assigned.some(id => id.toString() === currentUser.id.toString());
        if (!hasAccess) {
          const err = new Error('Access denied. You are not assigned to this event.');
          err.statusCode = 403;
          throw err;
        }
      }

      // Check event seat capacity
      if (event.seatCapacity && event.seatCapacity > 0) {
        if (event.filledSeats >= event.seatCapacity) {
          const err = new Error(`Event capacity is full. Maximum ${event.seatCapacity} students allowed.`);
          err.statusCode = 400;
          throw err;
        }
      }

      // Duplicate prevention for this event
      const normalizedEmail = email ? email.toLowerCase().trim() : customFields?.email?.toLowerCase()?.trim();
      if (normalizedEmail) {
        const existingStudent = await Student.findOne({
          where: {
            eventId: finalEventId,
            email: normalizedEmail
          }
        });
        if (existingStudent) {
          const err = new Error('A student with this email is already registered for this event.');
          err.statusCode = 400;
          throw err;
        }
      }
    }

    // 3. Prepare student data
    const studentData = {
      eventId: finalEventId,
      agentId: effectiveAgentId,
      customFields: customFields && typeof customFields === 'object' ? customFields : {},
      documents: [],
      status: 'Registered'
    };

    if (name) studentData.name = name.trim();
    if (email) studentData.email = email.toLowerCase().trim();
    if (phone) studentData.phone = phone.trim();
    if (country) studentData.country = country.trim();
    if (education) studentData.education = education.trim();
    if (courseInterested) studentData.courseInterested = courseInterested.trim();
    if (notes) studentData.notes = notes;

    const student = await Student.create(studentData);

    // Increment filledSeats if event-linked
    if (event) {
      await event.increment('filledSeats', { by: 1 });

      // Send confirmation email if applicable
      const studentEmail = customFields?.email || student.email;
      const studentName = customFields?.name || student.name;
      if (studentEmail && studentName) {
        try {
          const emailTemplate = templates.studentRegistration(studentName, event.title);
          await sendEmail(studentEmail, emailTemplate.subject, emailTemplate.html);
        } catch (mailErr) {
          console.warn('Registration email failed:', mailErr.message);
        }
      }
    }

    return await this.getStudentById(student.id, currentUser);
  }

  /**
   * Get students with search, filter, and pagination
   */
  async getStudents(query = {}, currentUser) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      eventId,
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

    // 2. Filters
    if (eventId) {
      where.eventId = eventId;
    }

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
          model: Event,
          as: 'event',
          attributes: ['id', 'title', 'date', 'location']
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
      students: rows.map(s => s.toJSON())
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

    return student.toJSON();
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

    const {
      eventId,
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
      const agentUser = await User.findByPk(agentId);
      if (!agentUser) {
        const err = new Error('Agent user not found');
        err.statusCode = 404;
        throw err;
      }
      student.agentId = agentId;
    }

    // Verify event if eventId is being updated
    if (eventId !== undefined) {
      if (eventId) {
        const ev = await Event.findByPk(eventId);
        if (!ev) {
          const err = new Error('Event not found');
          err.statusCode = 404;
          throw err;
        }
        student.eventId = eventId;
      } else {
        student.eventId = null;
      }
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

    // Delegate to applicationService with studentId filter
    return await applicationService.getApplications({ ...query, studentId }, currentUser);
  }
}

module.exports = new StudentService();
