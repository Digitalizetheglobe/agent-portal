const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/statsController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.get('/', getStats);

module.exports = router;
