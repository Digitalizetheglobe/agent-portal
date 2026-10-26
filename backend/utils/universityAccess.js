const { Op } = require('sequelize');

// Which universities an agent may see and submit students to.
// Super Admin sets this per agent (User.universityAccessMode / allowedUniversityIds).
// Staff and any non-agent user are never limited.

const ACCESS_MODES = ['all', 'malaysia_only', 'foreign_only', 'custom'];

const isAgent = (user) => user?.role === 'agent';

const getAccessMode = (user) => (ACCESS_MODES.includes(user?.universityAccessMode) ? user.universityAccessMode : 'all');

const getAllowedIds = (user) => (Array.isArray(user?.allowedUniversityIds) ? user.allowedUniversityIds.map(String) : []);

// Sequelize condition on University columns, or null when the user has no limit.
// `idColumn` / `countryColumn` let callers point at a joined table.
const universityAccessCondition = (user, { idColumn = 'id', countryColumn = 'country' } = {}) => {
  if (!isAgent(user)) return null;
  switch (getAccessMode(user)) {
    case 'malaysia_only':
      return { [countryColumn]: { [Op.iLike]: 'Malaysia' } };
    case 'foreign_only':
      return { [countryColumn]: { [Op.notILike]: 'Malaysia' } };
    case 'custom':
      return { [idColumn]: { [Op.in]: getAllowedIds(user) } };
    default:
      return null;
  }
};

// Adds the agent's university limit to a where clause (mutates and returns it).
const scopeWhereToUniversityAccess = (where, user) => {
  const condition = universityAccessCondition(user);
  if (!condition) return where;
  where[Op.and] = [...(where[Op.and] || []), condition];
  return where;
};

// True when the user may use this university (a model instance or { id, country }).
const canAccessUniversity = (user, university) => {
  if (!isAgent(user)) return true;
  const isMalaysian = String(university?.country || '').trim().toLowerCase() === 'malaysia';
  switch (getAccessMode(user)) {
    case 'malaysia_only':
      return isMalaysian;
    case 'foreign_only':
      return !isMalaysian;
    case 'custom':
      return getAllowedIds(user).includes(String(university?.id));
    default:
      return true;
  }
};

const assertCanAccessUniversity = (user, university) => {
  if (!canAccessUniversity(user, university)) {
    const err = new Error('You are not authorised to work with this university. Contact your Account Manager.');
    err.statusCode = 403;
    throw err;
  }
};

module.exports = {
  ACCESS_MODES,
  getAccessMode,
  getAllowedIds,
  universityAccessCondition,
  scopeWhereToUniversityAccess,
  canAccessUniversity,
  assertCanAccessUniversity
};
