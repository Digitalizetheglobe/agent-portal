const User = require('../models/User');
const Event = require('../models/Event');
const Student = require('../models/Student');

// @desc    Get dashboard stats
// @route   GET /api/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    let stats = {};

    if (req.user.role === 'admin') {
      // Admin sees all stats
      const totalAgents = await User.countDocuments({ role: 'agent' });
      const activeAgents = await User.countDocuments({ role: 'agent', status: 'active' });
      const totalEvents = await Event.countDocuments();
      
      // Get today's date for upcoming events
      const today = new Date().toISOString().split('T')[0];
      const upcomingEvents = await Event.countDocuments({ date: { $gte: today } });
      
      const totalStudents = await Student.countDocuments();

      stats = {
        totalAgents,
        activeAgents,
        totalEvents,
        upcomingEvents,
        totalStudents
      };
    } else {
      // Agent sees only their stats
      const today = new Date().toISOString().split('T')[0];
      
      const totalEvents = await Event.countDocuments({ assignedAgents: req.user._id });
      const upcomingEvents = await Event.countDocuments({ 
        assignedAgents: req.user._id,
        date: { $gte: today }
      });
      const totalStudents = await Student.countDocuments({ agentId: req.user._id });

      stats = {
        totalAgents: 0,
        activeAgents: 0,
        totalEvents,
        upcomingEvents,
        totalStudents
      };
    }

    res.status(200).json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};
