const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { User, Student, Application } = require('../models');
const { getScopedAgentIds } = require('../utils/agentScope');
const { DISPLAY_STAGES, DISPLAY_LABELS, INACTIVE_APPLICATION_STATUSES, getDisplayStage } = require('../utils/visaPipeline');

// Matches no agent: used for an Account Manager who has no agents assigned yet
const NO_AGENT = '00000000-0000-0000-0000-000000000000';

// @desc    Get dashboard stats
// @route   GET /api/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    // Account Managers see numbers for their own agents only (null = no limit)
    const scopedIds = await getScopedAgentIds(req.user);
    const scopedList = scopedIds && scopedIds.length ? scopedIds : [NO_AGENT];
    const agentWhere = scopedIds ? { id: { [Op.in]: scopedList } } : {};
    const filter = !isAdmin
      ? { agentId: req.user.id }
      : (scopedIds ? { agentId: { [Op.in]: scopedList } } : {});

    // 1. Basic Counts
    const totalAgents = isAdmin ? await User.count({ where: { role: 'agent', ...agentWhere } }) : 0;
    const activeAgents = isAdmin ? await User.count({ where: { role: 'agent', status: 'active', ...agentWhere } }) : 0;

    const totalStudents = await Student.count({ where: filter });
    // Students whose fees are confirmed (Visa 100% and fees accepted on at least one application)
    const convertedStudents = await Application.count({
      where: { ...filter, pipelineStage: 'Visa100', feeStatus: 'Accepted' },
      distinct: true,
      col: 'studentId'
    });

    const conversionRate = totalStudents > 0
      ? ((convertedStudents / totalStudents) * 100).toFixed(1)
      : 0;

    // 2b. Visa pipeline: every live application counts in exactly one stage, so moving a student on
    // lowers one count and raises the next. At Visa 100% it is either waiting for fees or fees paid.
    const pipelineApps = await Application.findAll({
      attributes: ['pipelineStage', 'feeStatus'],
      where: { ...filter, status: { [Op.notIn]: INACTIVE_APPLICATION_STATUSES } },
      raw: true
    });
    const pipelineCounts = Object.fromEntries(DISPLAY_STAGES.map(key => [key, 0]));
    pipelineApps.forEach(app => { pipelineCounts[getDisplayStage(app)] += 1; });
    const pipelineBreakdown = DISPLAY_STAGES.map(key => ({
      stage: key,
      label: DISPLAY_LABELS[key],
      count: pipelineCounts[key]
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
      WHERE ${!isAdmin ? '"agentId" = :agentId' : (scopedIds ? '"agentId" IN (:scopedIds)' : '1=1')}
        AND "createdAt" >= :sixMonthsAgo
      GROUP BY year, month
      ORDER BY year ASC, month ASC
    `;

    const trendResults = await sequelize.query(trendQuery, {
      replacements: {
        agentId: req.user.id,
        scopedIds: scopedList,
        sixMonthsAgo: sixMonthsAgo
      },
      type: sequelize.QueryTypes.SELECT
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedTrend = trendResults.map(item => ({
      month: `${months[item.month - 1]} ${item.year}`,
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
        where: filter,
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
      totalStudents,
      convertedStudents,
      conversionRate,
      pipelineBreakdown,
      registrationTrend: formattedTrend,
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
