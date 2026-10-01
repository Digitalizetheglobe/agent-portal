const { Op } = require('sequelize');
const { University, Application } = require('../models');
const applicationService = require('./applicationService');

const ALLOWED_STATUSES = ['active', 'inactive'];

class UniversityService {
  /**
   * Create a new University
   */
  async createUniversity(data, currentUser) {
    const {
      name,
      code,
      country,
      city,
      website,
      logoUrl,
      status = 'active',
      contactPerson,
      contactEmail,
      description
    } = data;

    // 1. Required field validations
    if (!name || !name.trim()) {
      const err = new Error('University name is required');
      err.statusCode = 400;
      throw err;
    }
    if (!country || !country.trim()) {
      const err = new Error('Country is required');
      err.statusCode = 400;
      throw err;
    }

    // 2. Validate status
    if (status && !ALLOWED_STATUSES.includes(status)) {
      const err = new Error(`Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    // 3. Validate and check unique code
    let trimmedCode = null;
    if (code && code.trim()) {
      trimmedCode = code.trim();
      const existing = await University.findOne({ where: { code: trimmedCode } });
      if (existing) {
        const err = new Error(`University code "${trimmedCode}" already exists`);
        err.statusCode = 409;
        throw err;
      }
    }

    // 4. Validate email if provided
    let trimmedEmail = null;
    if (contactEmail && contactEmail.trim()) {
      trimmedEmail = contactEmail.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        const err = new Error('Invalid contact email format');
        err.statusCode = 400;
        throw err;
      }
    }

    // 5. Create University
    const university = await University.create({
      name: name.trim(),
      code: trimmedCode,
      country: country.trim(),
      city: city ? city.trim() : null,
      website: website ? website.trim() : null,
      logoUrl: logoUrl ? logoUrl.trim() : null,
      status,
      contactPerson: contactPerson ? contactPerson.trim() : null,
      contactEmail: trimmedEmail,
      description: description ? description.trim() : null
    });

    const result = university.toJSON();
    result.applicationCount = 0;
    return result;
  }

  /**
   * Get list of universities with search, filtering, and pagination
   */
  async getUniversities(query = {}, currentUser) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      country,
      city
    } = query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (parsedPage - 1) * parsedLimit;

    const where = {};

    // 1. Status filter
    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        const err = new Error(`Invalid status filter. Allowed values: ${ALLOWED_STATUSES.join(', ')}`);
        err.statusCode = 400;
        throw err;
      }
      where.status = status;
    }

    // 2. Country filter
    if (country && country.trim()) {
      where.country = { [Op.iLike]: `%${country.trim()}%` };
    }

    // 3. City filter
    if (city && city.trim()) {
      where.city = { [Op.iLike]: `%${city.trim()}%` };
    }

    // 4. Search filter across name, code, country, city
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: term } },
        { code: { [Op.iLike]: term } },
        { country: { [Op.iLike]: term } },
        { city: { [Op.iLike]: term } }
      ];
    }

    const { count, rows } = await University.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit: parsedLimit,
      offset
    });

    // Populate applicationCount per university scoped by role
    const universityIds = rows.map(u => u.id);
    let countMap = new Map();
    if (universityIds.length > 0) {
      const countWhere = { universityId: { [Op.in]: universityIds } };
      if (currentUser && currentUser.role === 'agent') {
        countWhere.agentId = currentUser.id;
      }
      const appCounts = await Application.findAll({
        attributes: [
          'universityId',
          [Application.sequelize.fn('COUNT', Application.sequelize.col('id')), 'count']
        ],
        where: countWhere,
        group: ['universityId'],
        raw: true
      });
      appCounts.forEach(item => {
        countMap.set(item.universityId, parseInt(item.count, 10) || 0);
      });
    }

    const formattedUniversities = rows.map(u => {
      const json = u.toJSON();
      json.applicationCount = countMap.get(u.id) || 0;
      return json;
    });

    return {
      total: count,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(count / parsedLimit) || 1,
      universities: formattedUniversities
    };
  }

  /**
   * Get university by ID
   */
  async getUniversityById(id, currentUser) {
    const university = await University.findByPk(id);

    if (!university) {
      const err = new Error('University not found');
      err.statusCode = 404;
      throw err;
    }

    const countWhere = { universityId: id };
    if (currentUser && currentUser.role === 'agent') {
      countWhere.agentId = currentUser.id;
    }
    const applicationCount = await Application.count({ where: countWhere });

    const result = university.toJSON();
    result.applicationCount = applicationCount;
    return result;
  }

  /**
   * Update university details
   */
  async updateUniversity(id, updateData) {
    const university = await University.findByPk(id);

    if (!university) {
      const err = new Error('University not found');
      err.statusCode = 404;
      throw err;
    }

    const {
      name,
      code,
      country,
      city,
      website,
      logoUrl,
      contactPerson,
      contactEmail,
      description
    } = updateData;

    // Validate name if provided
    if (name !== undefined) {
      if (!name || !name.trim()) {
        const err = new Error('University name cannot be empty');
        err.statusCode = 400;
        throw err;
      }
      university.name = name.trim();
    }

    // Validate country if provided
    if (country !== undefined) {
      if (!country || !country.trim()) {
        const err = new Error('Country cannot be empty');
        err.statusCode = 400;
        throw err;
      }
      university.country = country.trim();
    }

    // Validate unique code if provided and changed
    if (code !== undefined) {
      const trimmedCode = code ? code.trim() : null;
      if (trimmedCode && trimmedCode !== university.code) {
        const duplicate = await University.findOne({
          where: {
            code: trimmedCode,
            id: { [Op.ne]: id }
          }
        });
        if (duplicate) {
          const err = new Error(`University code "${trimmedCode}" already exists`);
          err.statusCode = 409;
          throw err;
        }
      }
      university.code = trimmedCode;
    }

    // Validate email if provided
    if (contactEmail !== undefined) {
      const trimmedEmail = contactEmail ? contactEmail.trim().toLowerCase() : null;
      if (trimmedEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          const err = new Error('Invalid contact email format');
          err.statusCode = 400;
          throw err;
        }
      }
      university.contactEmail = trimmedEmail;
    }

    if (city !== undefined) university.city = city ? city.trim() : null;
    if (website !== undefined) university.website = website ? website.trim() : null;
    if (logoUrl !== undefined) university.logoUrl = logoUrl ? logoUrl.trim() : null;
    if (contactPerson !== undefined) university.contactPerson = contactPerson ? contactPerson.trim() : null;
    if (description !== undefined) university.description = description ? description.trim() : null;

    await university.save();

    const applicationCount = await Application.count({ where: { universityId: id } });
    const result = university.toJSON();
    result.applicationCount = applicationCount;
    return result;
  }

  /**
   * Update university status (active / inactive)
   */
  async updateUniversityStatus(id, newStatus) {
    if (!newStatus || !ALLOWED_STATUSES.includes(newStatus)) {
      const err = new Error(`Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const university = await University.findByPk(id);

    if (!university) {
      const err = new Error('University not found');
      err.statusCode = 404;
      throw err;
    }

    // Change status without affecting or cascading to applications
    university.status = newStatus;
    await university.save();

    const applicationCount = await Application.count({ where: { universityId: id } });
    const result = university.toJSON();
    result.applicationCount = applicationCount;
    return result;
  }

  /**
   * Delete university (with ON DELETE RESTRICT protection)
   */
  async deleteUniversity(id) {
    const university = await University.findByPk(id);

    if (!university) {
      const err = new Error('University not found');
      err.statusCode = 404;
      throw err;
    }

    // Protect existing applications: do not allow deletion if applications exist
    const applicationCount = await Application.count({ where: { universityId: id } });
    if (applicationCount > 0) {
      const err = new Error(`Cannot delete university because ${applicationCount} application(s) are associated with it.`);
      err.statusCode = 409;
      throw err;
    }

    await university.destroy();

    return {
      success: true,
      detail: 'University deleted successfully'
    };
  }

  /**
   * Get applications for this university with agent isolation
   */
  async getUniversityApplications(id, query, currentUser) {
    const university = await University.findByPk(id);

    if (!university) {
      const err = new Error('University not found');
      err.statusCode = 404;
      throw err;
    }

    // Delegate to applicationService with universityId filter
    // applicationService will automatically enforce agent ownership isolation if currentUser.role === 'agent'
    return await applicationService.getApplications({ ...query, universityId: id }, currentUser);
  }
}

module.exports = new UniversityService();
