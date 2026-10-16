const { Op } = require('sequelize');
const { User } = require('../models');
const { STAFF_ROLES } = require('../middleware/auth');
const { passwordProblem } = require('../utils/security');
const { isUuid } = require('../utils/universityContent');

// The super admin's view of the QStudy team: Head of Recruitment, Head of Admission, Accounts,
// Account Managers (and other super admins). Super admin only (the routes enforce it).
// Creating a staff account uses the existing POST /api/agents/admin.

const fail = (res, status, detail) => res.status(status).json({ success: false, detail });

const STAFF_ATTRIBUTES = ['id', 'name', 'email', 'phone', 'staffRole', 'status', 'createdAt', 'updatedAt'];

const activeSuperAdmins = (excludeId) => User.count({
  where: {
    role: 'admin',
    staffRole: null,
    status: 'active',
    ...(excludeId ? { id: { [Op.ne]: excludeId } } : {})
  }
});

// @route GET /api/staff
exports.list = async (req, res) => {
  try {
    const staff = await User.findAll({
      where: { role: 'admin' },
      attributes: STAFF_ATTRIBUTES,
      order: [['name', 'ASC']]
    });

    // How many agents each Account Manager looks after
    const agents = await User.findAll({
      where: { role: 'agent', accountManagerId: { [Op.ne]: null } },
      attributes: ['accountManagerId']
    });
    const agentCount = {};
    agents.forEach((a) => { agentCount[a.accountManagerId] = (agentCount[a.accountManagerId] || 0) + 1; });

    res.json(staff.map((s) => ({
      ...s.toJSON(),
      agentCount: s.staffRole === 'account_manager' ? (agentCount[s.id] || 0) : null
    })));
  } catch (error) {
    console.error('Staff list error:', error);
    fail(res, 500, 'Server error');
  }
};

// @route PATCH /api/staff/:id   { name?, phone?, staffRole?, status?, reassignAgentsTo? }
// staffRole: one of the four roles, or null / "" for super admin.
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return fail(res, 400, 'Invalid staff id');
    const member = await User.findOne({ where: { id, role: 'admin' } });
    if (!member) return fail(res, 404, 'Staff member not found');

    const body = req.body || {};
    const isSelf = member.id === req.user.id;
    const changes = {};

    if (body.name !== undefined) {
      const name = String(body.name || '').trim();
      if (!name) return fail(res, 400, 'A name is required');
      if (name.length > 100) return fail(res, 400, 'The name must be at most 100 characters');
      changes.name = name;
    }
    if (body.phone !== undefined) changes.phone = String(body.phone || '').trim() || null;

    if (body.staffRole !== undefined) {
      const staffRole = body.staffRole || null;
      if (staffRole && !STAFF_ROLES.includes(staffRole)) {
        return fail(res, 400, `Invalid role. Allowed: ${STAFF_ROLES.join(', ')}, or none for super admin`);
      }
      if (staffRole !== member.staffRole) {
        if (isSelf) return fail(res, 400, 'You cannot change your own role');
        changes.staffRole = staffRole;
      }
    }
    if (body.status !== undefined) {
      if (!['active', 'inactive'].includes(body.status)) return fail(res, 400, 'Status must be active or inactive');
      if (body.status !== member.status) {
        if (isSelf) return fail(res, 400, 'You cannot deactivate your own account');
        changes.status = body.status;
      }
    }

    // Never leave the portal without an active super admin
    const losesSuperAdmin = member.staffRole === null && member.status === 'active' &&
      (changes.staffRole !== undefined && changes.staffRole !== null || changes.status === 'inactive');
    if (losesSuperAdmin && (await activeSuperAdmins(member.id)) === 0) {
      return fail(res, 400, 'There must be at least one active super admin');
    }

    // An Account Manager who stops being one (or goes inactive) cannot leave agents without an owner
    const stopsManaging = member.staffRole === 'account_manager' &&
      ((changes.staffRole !== undefined && changes.staffRole !== 'account_manager') || changes.status === 'inactive');
    let reassignTo;
    if (stopsManaging) {
      const owned = await User.count({ where: { role: 'agent', accountManagerId: member.id } });
      if (owned > 0) {
        if (body.reassignAgentsTo === undefined) {
          return res.status(409).json({
            success: false,
            code: 'AGENTS_ASSIGNED',
            agentCount: owned,
            detail: `${member.name} looks after ${owned} agent${owned === 1 ? '' : 's'}. Choose who takes them over (or leave them unassigned).`
          });
        }
        if (body.reassignAgentsTo === null || body.reassignAgentsTo === '') {
          reassignTo = null;
        } else {
          const target = await User.findOne({
            where: { id: body.reassignAgentsTo, role: 'admin', staffRole: 'account_manager', status: 'active' },
            attributes: ['id']
          });
          if (!target || target.id === member.id) return fail(res, 400, 'Choose another active Account Manager');
          reassignTo = target.id;
        }
      }
    }

    if (Object.keys(changes).length === 0) return res.json(member.toJSON());

    Object.assign(member, changes);
    await member.save();
    if (reassignTo !== undefined) {
      const owned = await User.findAll({ where: { role: 'agent', accountManagerId: id } });
      for (const agent of owned) {
        agent.accountManagerId = reassignTo;
        await agent.save();
      }
    }
    res.json(member.toJSON());
  } catch (error) {
    console.error('Staff update error:', error);
    fail(res, 500, 'Server error');
  }
};

// @route POST /api/staff/:id/reset-password   { password }
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return fail(res, 400, 'Invalid staff id');
    const member = await User.findOne({ where: { id, role: 'admin' } });
    if (!member) return fail(res, 404, 'Staff member not found');
    if (member.id === req.user.id) return fail(res, 400, 'Change your own password from Settings');

    const problem = passwordProblem(req.body && req.body.password);
    if (problem) return fail(res, 400, problem);

    member.password = req.body.password; // hashed by the model hook
    await member.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Staff reset password error:', error);
    fail(res, 500, 'Server error');
  }
};
