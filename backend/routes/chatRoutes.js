const express = require('express');
const router = express.Router();
const chat = require('../controllers/chatController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

// Everyone: the WhatsApp link
router.get('/config', chat.config);

// Agent: their own conversations, `?channel=direct` (Account Manager, default) or `?channel=support` (helpdesk)
router.get('/me', restrictTo('agent'), chat.getMine);
router.post('/me', restrictTo('agent'), chat.sendMine);
router.get('/me/unread', restrictTo('agent'), chat.unreadMine);

// Staff: which channels they can open (and write in)
router.get('/access', restrictTo('admin'), chat.access);

// Staff: conversations with agents (Account Managers only see their own agents)
router.get('/conversations', restrictTo('admin'), chat.conversations);
router.get('/agents', restrictTo('admin'), chat.agents);
router.get('/conversations/:agentId', restrictTo('admin'), chat.getConversation);
router.post('/conversations/:agentId', restrictTo('admin'), chat.reply);

module.exports = router;
