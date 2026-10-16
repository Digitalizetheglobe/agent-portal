const { Op } = require('sequelize');
const { AuditLog } = require('../models');

const MAX_LIMIT = 100;

// @desc    Audit log: who changed what, and when
// @route   GET /api/audit-logs
// @access  Private (Head of Admission, super admin)
// Filters: entityType, entityId, action, actorId, actorRole, from, to (dates), search (summary / name / actor)
exports.getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), MAX_LIMIT);
    const { entityType, entityId, action, actorId, actorRole, from, to, search } = req.query;

    const where = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = String(entityId);
    if (action) {
      if (!['create', 'update', 'delete'].includes(action)) {
        return res.status(400).json({ success: false, detail: 'Action must be create, update or delete' });
      }
      where.action = action;
    }
    if (actorId) where.actorId = actorId;
    if (actorRole) where.actorRole = actorRole;

    if (from || to) {
      where.at = {};
      if (from) {
        const start = new Date(from);
        if (isNaN(start.getTime())) return res.status(400).json({ success: false, detail: 'The "from" date is not valid' });
        where.at[Op.gte] = start;
      }
      if (to) {
        const end = new Date(to);
        if (isNaN(end.getTime())) return res.status(400).json({ success: false, detail: 'The "to" date is not valid' });
        // A date without a time means the whole day
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(to))) end.setUTCHours(23, 59, 59, 999);
        where.at[Op.lte] = end;
      }
    }

    if (search && String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      where[Op.or] = [
        { summary: { [Op.iLike]: term } },
        { entityLabel: { [Op.iLike]: term } },
        { actorName: { [Op.iLike]: term } }
      ];
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order: [['at', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });

    // What can be filtered on, so the screen can offer real choices
    const entityTypes = await AuditLog.findAll({
      attributes: ['entityType'],
      group: ['entityType'],
      order: [['entityType', 'ASC']],
      raw: true
    });

    res.status(200).json({
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 1,
      entityTypes: entityTypes.map(row => row.entityType),
      logs: rows.map(row => row.toJSON())
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, detail: 'Server error' });
  }
};
