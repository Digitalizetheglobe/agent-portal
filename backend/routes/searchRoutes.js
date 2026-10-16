const express = require('express');
const router = express.Router();
const { search } = require('../controllers/searchController');
const { protect } = require('../middleware/auth');

// Any signed-in user; the controller limits what each person can find
router.use(protect);
router.get('/', search);

module.exports = router;
