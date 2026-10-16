export const STAFF_ROLE_LABELS = {
  account_manager: 'Account Manager',
  head_recruitment: 'Head of Recruitment',
  head_admission: 'Head of Admission',
  accounts: 'Accounts',
};

export const getRoleLabel = (user) => {
  if (!user) return '';
  if (user.role === 'admin') return STAFF_ROLE_LABELS[user.staffRole] || 'Super Admin';
  return user.role;
};

// Super admin (no staffRole), or an admin holding one of the given staff roles.
// Mirrors the backend's restrictToSuperAdminOr / restrictToStaffRole; the backend enforces it,
// this only decides which buttons to show.
export const hasStaffRole = (user, ...roles) =>
  user?.role === 'admin' && (!user.staffRole || roles.includes(user.staffRole));
