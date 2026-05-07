const express = require('express');
const router = express.Router();
const { 
  getEvents, 
  getEvent, 
  createEvent, 
  updateEvent, 
  deleteEvent,
  notifyAgents
} = require('../controllers/eventController');
const { protect, restrictTo } = require('../middleware/auth');

// All routes are Update the student's information
router.use(protect);

// Routes accessible by all authenticated users
router.get('/', getEvents);
router.get('/:id', getEvent);

// Admin only routes
router.post('/', restrictTo('admin'), createEvent);
router.put('/:id', restrictTo('admin'), updateEvent);
router.delete('/:id', restrictTo('admin'), deleteEvent);
router.post('/:id/notify', restrictTo('admin'), notifyAgents);

module.exports = router;
