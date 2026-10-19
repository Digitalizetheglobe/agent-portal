const { Op } = require('sequelize');
const { Course, University } = require('../models');
const { sequelize } = require('../config/db');
const { isUuid } = require('../utils/universityContent');

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

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const effectiveLimit = Math.max(1, parseInt(limit, 10));

    const { count, rows } = await Course.findAndCountAll({
      where,
      include: [
        {
          model: University,
          as: 'university',
          attributes: ['id', 'name', 'code', 'country']
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
  async getCourseById(id) {
    const course = await Course.findByPk(id, {
      include: [
        {
          model: University,
          as: 'university',
          attributes: ['id', 'name', 'code', 'country']
        }
      ]
    });

    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }

    return course.toJSON();
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

    let finalUniversityIds = [];
    if (Array.isArray(universityIds)) {
      finalUniversityIds = universityIds.filter(id => id && id !== 'all' && id !== 'none');
    } else if (universityId && universityId !== 'none' && universityId !== 'all') {
      finalUniversityIds = [universityId];
    }

    const primaryUniId = finalUniversityIds.length > 0 ? finalUniversityIds[0] : null;
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
      let finalUniversityIds = [];
      if (Array.isArray(universityIds)) {
        finalUniversityIds = universityIds.filter(id => id && id !== 'all' && id !== 'none');
      } else if (universityId && universityId !== 'none' && universityId !== 'all') {
        finalUniversityIds = [universityId];
      }
      course.universityIds = finalUniversityIds;
      course.universityId = finalUniversityIds.length > 0 ? finalUniversityIds[0] : null;
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

module.exports = new CourseService();
