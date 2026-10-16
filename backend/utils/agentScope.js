const { Op } = require('sequelize');
const User = require('../models/User');

// An Account Manager only works with the agents assigned to them (User.accountManagerId).
// These helpers add that limit on top of the existing agent-ownership checks.
// Every other staff role and super admin is unaffected (no extra limit).

const isAccountManager = (user) => user?.role === 'admin' && user.staffRole === 'account_manager';

// Ids of the agents assigned to an Account Manager, or null when no extra limit applies.
const getScopedAgentIds = async (user) => {
  if (!isAccountManager(user)) return null;
  const agents = await User.findAll({
    where: { role: 'agent', accountManagerId: user.id },
    attributes: ['id']
  });
  return agents.map(a => a.id);
};

// Limits a where clause to the Account Manager's agents. `column` is the agent id column
// ('agentId' by default). An agent filter the caller already set is kept if it is allowed,
// otherwise the query returns nothing.
const scopeWhereToAgents = async (where, user, column = 'agentId') => {
  const ids = await getScopedAgentIds(user);
  if (ids === null) return where;

  const current = where[column];
  if (current === undefined) {
    where[column] = { [Op.in]: ids };
  } else if (typeof current === 'string' && !ids.includes(current)) {
    where[column] = { [Op.in]: [] };
  }
  return where;
};

// False when an Account Manager touches a record that belongs to someone else's agent.
// Everyone else passes (their own checks live where the record is loaded).
const canAccessAgent = async (user, agentId) => {
  if (!isAccountManager(user)) return true;
  if (!agentId) return false;
  const owned = await User.count({ where: { id: agentId, role: 'agent', accountManagerId: user.id } });
  return owned > 0;
};

// Same check, for services: throws a 403.
const assertCanAccessAgent = async (user, agentId) => {
  if (!(await canAccessAgent(user, agentId))) {
    const err = new Error('Access denied. This record belongs to an agent who is not assigned to you.');
    err.statusCode = 403;
    throw err;
  }
};

module.exports = { isAccountManager, getScopedAgentIds, scopeWhereToAgents, canAccessAgent, assertCanAccessAgent };
