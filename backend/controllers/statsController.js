const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { User, Event, Student } = require('../models');

// @desc    Get dashboard stats
// @route   GET /api/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const filter = isAdmin ? {} : { agentId: req.user.id };
    const today = new Date().toISOString().split('T')[0];

    // 1. Basic Counts
    const totalAgents = isAdmin ? await User.count({ where: { role: 'agent' } }) : 0;
    const activeAgents = isAdmin ? await User.count({ where: { role: 'agent', status: 'active' } }) : 0;

    let totalEvents = 0;
    let upcomingEvents = 0;

    if (isAdmin) {
      totalEvents = await Event.count();
      upcomingEvents = await Event.count({
        where: { date: { [Op.gte]: today } }
      });
    } else {
      totalEvents = await Event.count({
        where: sequelize.literal(`"assignedAgents"::jsonb @> '["${req.user.id}"]'`)
      });
      upcomingEvents = await Event.count({
        where: {
          [Op.and]: [
            sequelize.literal(`"assignedAgents"::jsonb @> '["${req.user.id}"]'`),
            { date: { [Op.gte]: today } }
          ]
        }
      });
    }

    const totalStudents = await Student.count({ where: filter });
    const convertedStudents = await Student.count({
      where: { ...filter, status: 'Converted' }
    });

    const conversionRate = totalStudents > 0
      ? ((convertedStudents / totalStudents) * 100).toFixed(1)
      : 0;

    // 2. Status Breakdown
    const statusData = await Student.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: filter,
      group: ['status'],
      raw: true
    });

    const statusBreakdown = statusData.map(item => ({
      status: item.status,
      count: parseInt(item.count, 10) || 0
    }));

    // 3. Registration Trend (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const trendQuery = `
      SELECT 
        EXTRACT(YEAR FROM "createdAt")::int AS year,
        EXTRACT(MONTH FROM "createdAt")::int AS month,
        COUNT(*)::int AS count
      FROM "Students"
      WHERE ${isAdmin ? '1=1' : '"agentId" = :agentId'}
        AND "createdAt" >= :sixMonthsAgo
      GROUP BY year, month
      ORDER BY year ASC, month ASC
    `;

    const trendResults = await sequelize.query(trendQuery, {
      replacements: {
        agentId: req.user.id,
        sixMonthsAgo: sixMonthsAgo
      },
      type: sequelize.QueryTypes.SELECT
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedTrend = trendResults.map(item => ({
      month: `${months[item.month - 1]} ${item.year}`,
      count: parseInt(item.count, 10) || 0
    }));

    // 4. Event Breakdown (Registrations per Event)
    const eventBreakdownData = await Student.findAll({
      attributes: [
        'eventId',
        [sequelize.fn('COUNT', sequelize.col('Student.id')), 'count']
      ],
      include: [{
        model: Event,
        as: 'event',
        attributes: ['title'],
        required: true
      }],
      where: filter,
      group: ['Student.eventId', 'event.id', 'event.title'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 5,
      raw: true,
      nest: true
    });

    const eventBreakdown = eventBreakdownData.map(item => ({
      title: item.event?.title || 'Unknown Event',
      count: parseInt(item.count, 10) || 0
    }));

    // 5. Agent Breakdown (Admin only)
    let agentBreakdown = [];
    if (isAdmin) {
      const agentBreakdownData = await Student.findAll({
        attributes: [
          'agentId',
          [sequelize.fn('COUNT', sequelize.col('Student.id')), 'count']
        ],
        include: [{
          model: User,
          as: 'agent',
          attributes: ['name'],
          required: true
        }],
        group: ['Student.agentId', 'agent.id', 'agent.name'],
        order: [[sequelize.literal('count'), 'DESC']],
        limit: 5,
        raw: true,
        nest: true
      });

      agentBreakdown = agentBreakdownData.map(item => ({
        name: item.agent?.name || 'Unknown Agent',
        count: parseInt(item.count, 10) || 0
      }));
    }

    res.status(200).json({
      totalAgents,
      activeAgents,
      totalEvents,
      upcomingEvents,
      totalStudents,
      convertedStudents,
      conversionRate,
      statusBreakdown,
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
