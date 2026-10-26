const { Op } = require('sequelize');
const { Course, University } = require('../models');
const { sequelize } = require('../config/db');
const { isUuid } = require('../utils/universityContent');
const { universityAccessCondition } = require('../utils/universityAccess');

const normalizeCode = (code) => (code ? String(code).trim().toUpperCase() : '');

/**
 * Reject an active course that is indistinguishable from another active course:
 * same name, code and level with overlapping universities. A course with no
 * universities is open to all, so it overlaps every other course.
 */
const assertNoAmbiguousDuplicate = async ({ id, name, code, level, universityIds, status }) => {
  if (status !== 'active') return;

  const candidates = await Course.findAll({
    where: {
      id: id ? { [Op.ne]: id } : { [Op.ne]: null },
      status: 'active',
      level,
      [Op.and]: [
        sequelize.where(sequelize.fn('lower', sequelize.col('name')), name.trim().toLowerCase())
      ]
    }
  });

  const myIds = universityIds.map(String);
  const conflict = candidates.find(c => {
    if (normalizeCode(c.code) !== normalizeCode(code)) return false;
    const otherIds = c.toJSON().universityIds;
    if (myIds.length === 0 || otherIds.length === 0) return true;
    return myIds.some(uid => otherIds.includes(uid));
  });

  if (conflict) {
    const err = new Error(
      `An active "${conflict.name}" course with the same code and level already exists for ` +
      `${conflict.toJSON().universityIds.length ? 'an overlapping university' : 'all universities'} ` +
      `(${conflict.tuitionFee || 'no fee set'}, ${conflict.duration || 'no duration set'}). ` +
      'Change the name or code, or limit the universities of one course so they do not overlap.'
    );
    err.statusCode = 409;
    throw err;
  }
};

// A program belongs to exactly one university (each university sets its own price). Returns that university's id.
const resolveSingleUniversity = async ({ universityId, universityIds }) => {
  let ids = [];
  if (Array.isArray(universityIds)) {
    ids = universityIds.filter(id => id && id !== 'all' && id !== 'none');
  } else if (universityId && universityId !== 'none' && universityId !== 'all') {
    ids = [universityId];
  }
  if (ids.length === 0) {
    const err = new Error('Choose the university this program belongs to.');
    err.statusCode = 400;
    throw err;
  }
  if (ids.length > 1) {
    const err = new Error('A program belongs to one university. Add a separate program for each university, so each can have its own price.');
    err.statusCode = 400;
    throw err;
  }
  if (!isUuid(String(ids[0])) || !(await University.count({ where: { id: ids[0] } }))) {
    const err = new Error('The selected university was not found.');
    err.statusCode = 400;
    throw err;
  }
  return String(ids[0]);
};

class CourseService {
  /**
   * Get all courses with optional filters (search, universityId, level, status)
   */
  async getCourses(query = {}, currentUser = null) {
    const {
      page = 1,
      limit = 100,
      search = '',
      universityId,
      level,
      status,
      sortBy = 'name',
      sortOrder = 'ASC'
    } = query;

    const where = {};

    // Status filtering: admins see every status unless they filter; non-admins only see active courses
    if (currentUser?.role === 'admin') {
      if (status && status !== 'all') {
        where.status = status;
      }
    } else {
      where.status = 'active';
    }

    // University filtering (supports single universityId, multi-university JSON array, and open-to-all)
    if (universityId) {
      if (universityId === 'general') {
        where[Op.or] = [
          { universityId: null },
          sequelize.literal(`"Course"."universityIds" IS NULL OR "Course"."universityIds"::text = '[]'`)
        ];
      } else {
        if (!isUuid(universityId)) {
          const err = new Error('Invalid university id');
          err.statusCode = 400;
          throw err;
        }
        where[Op.or] = [
          { universityId },
          { universityId: null },
          sequelize.literal(`"Course"."universityIds"::text LIKE '%${universityId}%'`),
          sequelize.literal(`"Course"."universityIds" IS NULL OR "Course"."universityIds"::text = '[]'`)
        ];
      }
    }

    // Level filtering
    if (level && level !== 'all') {
      where.level = level;
    }

    // Search query across name, code, department
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      const searchConditions = [
        { name: { [Op.iLike]: term } },
        { code: { [Op.iLike]: term } },
        { department: { [Op.iLike]: term } }
      ];

      if (where[Op.or]) {
        where[Op.and] = [
          { [Op.or]: where[Op.or] },
          { [Op.or]: searchConditions }
        ];
        delete where[Op.or];
      } else {
        where[Op.or] = searchConditions;
      }
    }

    // Agents only see courses open to all, or offered by a university they are allowed to use
    const accessCondition = universityAccessCondition(currentUser);
    if (accessCondition) {
      const allowed = await University.findAll({ where: accessCondition, attributes: ['id'], raw: true });
      where[Op.and] = [
        ...(where[Op.and] || []),
        {
          [Op.or]: [
            { universityId: null },
            { universityId: { [Op.in]: allowed.map(u => u.id) } },
            sequelize.literal(`"Course"."universityIds" IS NULL OR "Course"."universityIds"::text = '[]'`),
            ...allowed.map(u => sequelize.literal(`"Course"."universityIds"::text LIKE '%${u.id}%'`))
          ]
        }
      ];
    }

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const effectiveLimit = Math.max(1, parseInt(limit, 10));

    const { count, rows } = await Course.findAndCountAll({
      where,
      include: [
        {
          model: University,
          as: 'university',
          attributes: ['id', 'name', 'code', 'country', 'logoUrl', 'commissionRate']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: effectiveLimit,
      offset,
      distinct: true
    });

    // Aggregates across the whole filtered result set (not just the current page)
    const [activeCount, levelCount] = await Promise.all([
      Course.count({ where: { [Op.and]: [where, { status: 'active' }] } }),
      Course.count({ where, distinct: true, col: 'level' })
    ]);

    return {
      courses: rows.map(r => r.toJSON()),
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / effectiveLimit) || 1,
      stats: { activeCount, levelCount }
    };
  }

  /**
   * Get single course by ID
   */
  async getCourseById(id, currentUser = null) {
    const course = await Course.findByPk(id, {
      include: [
        {
          model: University,
          as: 'university',
          attributes: ['id', 'name', 'code', 'country', 'logoUrl', 'commissionRate']
        }
      ]
    });

    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }

    const json = course.toJSON();

    // Agents only see active programs, offered by a university they are allowed to use
    const isAgent = currentUser?.role === 'agent';
    if (isAgent && course.status !== 'active') {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }

    // Every university that offers it (empty list = open to all universities)
    const offeredIds = Array.isArray(json.universityIds) ? json.universityIds : [];
    let universities = [];
    if (offeredIds.length > 0) {
      const where = { id: { [Op.in]: offeredIds } };
      const access = universityAccessCondition(currentUser);
      universities = await University.findAll({
        where: access ? { [Op.and]: [where, access] } : where,
        attributes: ['id', 'name', 'code', 'country', 'city', 'logoUrl', 'commissionRate', 'status'],
        order: [['name', 'ASC']]
      });
      if (isAgent) universities = universities.filter(u => u.status === 'active');
      if (isAgent && universities.length === 0) {
        const err = new Error('Course not found');
        err.statusCode = 404;
        throw err;
      }
    }
    json.universities = universities.map(u => u.toJSON());

    return json;
  }

  /**
   * Create a new course (Admin only)
   */
  async createCourse(data) {
    const {
      name,
      code,
      level,
      department,
      duration,
      tuitionFee,
      universityId,
      universityIds,
      status,
      description
    } = data;

    if (!name || !name.trim()) {
      const err = new Error('Course name is required');
      err.statusCode = 400;
      throw err;
    }

    const primaryUniId = await resolveSingleUniversity({ universityId, universityIds });
    const finalUniversityIds = [primaryUniId];
    const finalLevel = level ? level.trim() : 'Undergraduate';
    const finalStatus = status === 'inactive' ? 'inactive' : 'active';

    await assertNoAmbiguousDuplicate({
      name,
      code,
      level: finalLevel,
      universityIds: finalUniversityIds,
      status: finalStatus
    });

    const course = await Course.create({
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : null,
      level: finalLevel,
      department: department ? department.trim() : null,
      duration: duration ? duration.trim() : null,
      tuitionFee: tuitionFee ? tuitionFee.trim() : null,
      universityId: primaryUniId,
      universityIds: finalUniversityIds,
      status: status === 'inactive' ? 'inactive' : 'active',
      description: description ? description.trim() : null
    });

    return await this.getCourseById(course.id);
  }

  /**
   * Update an existing course (Admin only)
   */
  async updateCourse(id, data) {
    const course = await Course.findByPk(id);
    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }

    const {
      name,
      code,
      level,
      department,
      duration,
      tuitionFee,
      universityId,
      universityIds,
      status,
      description
    } = data;

    if (name !== undefined) {
      if (!name || !name.trim()) {
        const err = new Error('Course name cannot be empty');
        err.statusCode = 400;
        throw err;
      }
      course.name = name.trim();
    }

    if (code !== undefined) course.code = code ? code.trim().toUpperCase() : null;
    if (level !== undefined) course.level = level ? level.trim() : 'Undergraduate';
    if (department !== undefined) course.department = department ? department.trim() : null;
    if (duration !== undefined) course.duration = duration ? duration.trim() : null;
    if (tuitionFee !== undefined) course.tuitionFee = tuitionFee ? tuitionFee.trim() : null;
    if (status !== undefined) course.status = status === 'inactive' ? 'inactive' : 'active';
    if (description !== undefined) course.description = description ? description.trim() : null;

    if (universityIds !== undefined || universityId !== undefined) {
      const onlyId = await resolveSingleUniversity({ universityId, universityIds });
      course.universityIds = [onlyId];
      course.universityId = onlyId;
    } else if ((course.toJSON().universityIds || []).length !== 1) {
      // Older programs were set up for several universities or all of them: saving needs one university
      const err = new Error('Choose the one university this program belongs to before saving it.');
      err.statusCode = 400;
      throw err;
    }

    await assertNoAmbiguousDuplicate({
      id: course.id,
      name: course.name,
      code: course.code,
      level: course.level,
      universityIds: course.toJSON().universityIds,
      status: course.status
    });

    await course.save();
    return await this.getCourseById(course.id);
  }

  /**
   * Update course active/inactive status
   */
  async updateStatus(id, newStatus) {
    const course = await Course.findByPk(id);
    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }

    if (!['active', 'inactive'].includes(newStatus)) {
      const err = new Error('Invalid status. Must be "active" or "inactive"');
      err.statusCode = 400;
      throw err;
    }

    // Re-activating must not create an ambiguous duplicate
    await assertNoAmbiguousDuplicate({
      id: course.id,
      name: course.name,
      code: course.code,
      level: course.level,
      universityIds: course.toJSON().universityIds,
      status: newStatus
    });

    course.status = newStatus;
    await course.save();
    return await this.getCourseById(course.id);
  }

  /**
   * Delete course
   */
  async deleteCourse(id) {
    const course = await Course.findByPk(id);
    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }

    await course.destroy();
    return { success: true, message: 'Course deleted successfully' };
  }
}

const courseService = new CourseService();
// Shared with the bulk import so it applies the same duplicate rule
courseService.assertNoAmbiguousDuplicate = assertNoAmbiguousDuplicate;

module.exports = courseService;
