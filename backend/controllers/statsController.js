const User = require('../models/User');
const Event = require('../models/Event');
const Student = require('../models/Student');

// @desc    Get dashboard stats
// @route   GET /api/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const filter = isAdmin ? {} : { agentId: req.user._id };
    
    // 1. Basic Counts
    const totalAgents = isAdmin ? await User.countDocuments({ role: 'agent' }) : 0;
    const activeAgents = isAdmin ? await User.countDocuments({ role: 'agent', status: 'active' }) : 0;
    const totalEvents = isAdmin 
      ? await Event.countDocuments() 
      : await Event.countDocuments({ assignedAgents: req.user._id });
    
    const today = new Date().toISOString().split('T')[0];
    const upcomingEvents = isAdmin
      ? await Event.countDocuments({ date: { $gte: today } })
      : await Event.countDocuments({ 
          assignedAgents: req.user._id,
          date: { $gte: today }
        });

    const totalStudents = await Student.countDocuments(filter);
    const convertedStudents = await Student.countDocuments({ ...filter, status: 'Converted' });
    
    const conversionRate = totalStudents > 0 
      ? ((convertedStudents / totalStudents) * 100).toFixed(1) 
      : 0;

    // 2. Status Breakdown
    const statusBreakdown = await Student.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 3. Registration Trend (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const registrationTrend = await Student.aggregate([
      { 
        $match: { 
          ...filter, 
          createdAt: { $gte: sixMonthsAgo } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format registration trend for charts
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedTrend = registrationTrend.map(item => ({
      month: `${months[item._id.month - 1]} ${item._id.year}`,
      count: item.count
    }));

    // 4. Event Breakdown (Registrations per Event)
    const eventBreakdown = await Student.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$eventId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $project: {
          title: '$event.title',
          count: 1
        }
      }
    ]);

    // 5. Agent Breakdown (Admin only)
    let agentBreakdown = [];
    if (isAdmin) {
      agentBreakdown = await Student.aggregate([
        {
          $group: {
            _id: '$agentId',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'agent'
          }
        },
        { $unwind: '$agent' },
        {
          $project: {
            name: '$agent.name',
            count: 1
          }
        }
      ]);
    }

    res.status(200).json({
      totalAgents,
      activeAgents,
      totalEvents,
      upcomingEvents,
      totalStudents,
      convertedStudents,
      conversionRate,
      statusBreakdown: statusBreakdown.map(sb => ({ status: sb._id, count: sb.count })),
      registrationTrend: formattedTrend,
      eventBreakdown,
      agentBreakdown
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};
