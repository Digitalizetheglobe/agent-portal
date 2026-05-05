const express = require('express');
const router = express.Router();
const { 
  createTicket, 
  getTickets, 
  getTicket, 
  addResponse, 
  updateTicketStatus 
} = require('../controllers/ticketController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .post(createTicket)
  .get(getTickets);

router.route('/:id')
  .get(getTicket);

router.post('/:id/responses', addResponse);
router.patch('/:id/status', updateTicketStatus);

module.exports = router;
