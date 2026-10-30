const express = require('express');
const router = express.Router();
const {
  createInvite,
  getInvites,
  revokeInvite,
  getInviteByToken,
  registerWithInvite
} = require('../controllers/onboardingController');
const { protect, restrictToSuperAdminOr } = require('../middleware/auth');

// Staff: manage invites (declared before the public /:token routes)
const canInvite = restrictToSuperAdminOr('account_manager');
router.post('/invites', protect, canInvite, createInvite);
router.get('/invites', protect, canInvite, getInvites);
router.patch('/invites/:id/revoke', protect, canInvite, revokeInvite);

// Public: the invite token is the credential
router.get('/:token', getInviteByToken);
router.post('/:token/register', registerWithInvite);

module.exports = router;
