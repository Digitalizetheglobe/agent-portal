const express = require('express');
const router = express.Router();
const { 
  getAgents, 
  getAgent, 
  createAgent, 
  updateAgent, 
  deleteAgent 
} = require('../controllers/agentController');
const { protect, restrictTo } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Routes accessible by all authenticated users
router.get('/', getAgents);
router.get('/:id', getAgent);

// Admin only routes
router.post('/', restrictTo('admin'), createAgent);
router.put('/:id', restrictTo('admin'), updateAgent);
router.delete('/:id', restrictTo('admin'), deleteAgent);

module.exports = router;
