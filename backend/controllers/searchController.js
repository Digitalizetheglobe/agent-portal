const { Op } = require('sequelize');
const { User, Student, Application, University, UniversityUpdate, Course, Invoice, Payoff } = require('../models');
const { sequelize } = require('../config/db');
const { scopeWhereToAgents } = require('../utils/agentScope');

// Global search: one box that finds universities, courses, students, applications, invoices, payoffs
// and (for staff) agents. Everyone only finds what they could already open from the lists:
//   - an agent finds their own students, applications, invoices and payoffs
//   - an Account Manager finds only the records of their own agents
//   - other staff find everything

const MIN_LENGTH = 2;

// Characters that mean something to LIKE must be searched literally
const escapeLike = (text) => text.replace(/[\\%_]/g, (ch) => `\\${ch}`);

const hasAnyOf = (fields, term) => fields.map((field) => ({ [field]: { [Op.iLike]: term } }));

exports.search = async (req, res) => {
  try {
    const raw = String(req.query.q || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 10);
    const user = req.user;
    const isAgent = user.role === 'agent';
    const base = isAgent ? '/agent' : '/admin';

    if (raw.length < MIN_LENGTH) {
      return res.status(200).json({ query: raw, total: 0, groups: [] });
    }

    const term = `%${escapeLike(raw)}%`;

    // Students visible to this person (also used to find applications by student name)
    const studentWhere = { [Op.or]: hasAnyOf(['name', 'email', 'phone', 'country', 'courseInterested'], term) };
    if (isAgent) studentWhere.agentId = user.id;
    await scopeWhereToAgents(studentWhere, user);

    const universityWhere = {
      [Op.or]: [
        ...hasAnyOf(['name', 'code', 'country', 'city', 'website', 'description'], term),
        // Fee names / notes and brochure titles are searchable too
        sequelize.where(sequelize.cast(sequelize.col('University.fees'), 'text'), { [Op.iLike]: term }),
        sequelize.where(sequelize.cast(sequelize.col('University.brochures'), 'text'), { [Op.iLike]: term }),
      ]
    };
    if (isAgent) universityWhere.status = 'active';

    const courseWhere = { [Op.or]: hasAnyOf(['name', 'code', 'department'], term) };
    if (isAgent) courseWhere.status = 'active';

    // News and scholarship updates published for universities (agents: active universities only)
    const updateWhere = { [Op.or]: hasAnyOf(['title', 'content', 'amount'], term) };
    const updateInclude = {
      model: University,
      as: 'university',
      attributes: ['id', 'name', 'status'],
      required: true,
      ...(isAgent ? { where: { status: 'active' } } : {})
    };

    const [universities, courses, students, universityUpdates] = await Promise.all([
      University.findAll({ where: universityWhere, order: [['name', 'ASC']], limit }),
      Course.findAll({ where: courseWhere, order: [['name', 'ASC']], limit }),
      Student.findAll({ where: studentWhere, order: [['name', 'ASC']], limit }),
      UniversityUpdate.findAll({ where: updateWhere, include: [updateInclude], order: [['publishedAt', 'DESC']], limit })
    ]);

    // Applications: by number, course, or by the student's name
    const studentIdsByName = (await Student.findAll({
      where: studentWhere,
      attributes: ['id'],
      limit: 50
    })).map((student) => student.id);

    const applicationWhere = {
      [Op.or]: [
        ...hasAnyOf(['applicationNumber', 'courseName'], term),
        ...(studentIdsByName.length ? [{ studentId: { [Op.in]: studentIdsByName } }] : [])
      ]
    };
    if (isAgent) applicationWhere.agentId = user.id;
    await scopeWhereToAgents(applicationWhere, user);

    const invoiceWhere = { [Op.or]: hasAnyOf(['invoiceNumber', 'remarks'], term) };
    if (isAgent) invoiceWhere.agentId = user.id;
    await scopeWhereToAgents(invoiceWhere, user);

    const payoffWhere = { [Op.or]: hasAnyOf(['payoffNumber', 'settlementReference'], term) };
    if (isAgent) payoffWhere.agentId = user.id;
    await scopeWhereToAgents(payoffWhere, user);

    const agentWhere = {
      role: 'agent',
      [Op.or]: hasAnyOf(['name', 'email', 'userId', 'agencyName'], term)
    };
    await scopeWhereToAgents(agentWhere, user, 'id');

    const [applications, invoices, payoffs, agents] = await Promise.all([
      Application.findAll({
        where: applicationWhere,
        include: [{ model: Student, as: 'student', attributes: ['name'] }],
        order: [['createdAt', 'DESC']],
        limit
      }),
      Invoice.findAll({ where: invoiceWhere, order: [['createdAt', 'DESC']], limit }),
      Payoff.findAll({ where: payoffWhere, order: [['createdAt', 'DESC']], limit }),
      isAgent ? Promise.resolve([]) : User.findAll({ where: agentWhere, order: [['name', 'ASC']], limit })
    ]);

    const join = (...parts) => parts.filter(Boolean).join(' · ');
    const groups = [
      {
        type: 'university',
        label: 'Universities',
        items: universities.map((u) => ({
          id: u.id,
          title: u.name,
          subtitle: join(u.code, [u.city, u.country].filter(Boolean).join(', ')),
          path: `${base}/universities/${u.id}`
        }))
      },
      {
        type: 'university-update',
        label: 'University news and scholarships',
        items: universityUpdates.map((u) => ({
          id: u.id,
          title: u.title,
          subtitle: join(u.type === 'scholarship' ? 'Scholarship' : 'News', u.university && u.university.name, u.amount),
          path: `${base}/universities/${u.universityId}`
        }))
      },
      {
        type: 'course',
        label: 'Courses',
        items: courses.map((c) => ({
          id: c.id,
          title: c.name,
          subtitle: join(c.code, c.level, c.department),
          // Agents have no courses page: open the university the course belongs to
          path: isAgent
            ? (c.universityId ? `/agent/universities/${c.universityId}` : '/agent/universities')
            : '/admin/courses'
        }))
      },
      {
        type: 'student',
        label: 'Students',
        items: students.map((s) => ({
          id: s.id,
          title: s.name || s.email || 'Student',
          subtitle: join(s.email, s.country),
          path: `${base}/students/${s.id}`
        }))
      },
      {
        type: 'application',
        label: 'Applications',
        items: applications.map((a) => ({
          id: a.id,
          title: a.applicationNumber,
          subtitle: join(a.student && a.student.name, a.courseName, a.status),
          path: `${base}/applications/${a.id}`
        }))
      },
      {
        type: 'invoice',
        label: 'Invoices',
        items: invoices.map((i) => ({
          id: i.id,
          title: i.invoiceNumber,
          subtitle: join(i.status, i.amount != null ? `${Number(i.amount).toLocaleString()}` : null),
          path: `${base}/invoices`
        }))
      },
      {
        type: 'payoff',
        label: 'Payoffs',
        items: payoffs.map((p) => ({
          id: p.id,
          title: p.payoffNumber,
          subtitle: join(p.status, p.settlementReference),
          path: `${base}/payoffs`
        }))
      },
      {
        type: 'agent',
        label: 'Agents',
        items: agents.map((a) => ({
          id: a.id,
          title: a.name,
          subtitle: join(a.agencyName, a.email),
          path: `/admin/agents/${a.id}`
        }))
      }
    ].filter((group) => group.items.length > 0);

    res.status(200).json({
      query: raw,
      total: groups.reduce((sum, group) => sum + group.items.length, 0),
      groups
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, detail: 'Server error' });
  }
};
