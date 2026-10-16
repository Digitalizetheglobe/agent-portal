const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { ChatMessage, User } = require('../models');
const { isUuid } = require('../utils/universityContent');
const { canAccessAgent, getScopedAgentIds } = require('../utils/agentScope');
const { createNotification } = require('./notificationController');

// Live chat between an agent and QStudy staff (one conversation per agent).
//   - an agent only ever sees their own conversation
//   - staff see the conversations of the agents they may work with (Account Managers: only their own agents)
//   - any staff member can reply; the reply shows the staff member's name
// The chat is plain polling (the screens ask every few seconds); no extra server is needed.

const MAX_LENGTH = 2000;
const PAGE = 100;

const fail = (res, status, detail) => res.status(status).json({ success: false, detail });

const format = (m) => ({
  id: m.id,
  agentId: m.agentId,
  senderId: m.senderId,
  senderName: m.sender ? m.sender.name : null,
  fromAgent: m.fromAgent,
  body: m.body,
  readAt: m.readAt,
  createdAt: m.createdAt
});

const include = [{ model: User, as: 'sender', attributes: ['id', 'name'] }];

// Messages of one conversation, oldest first. `after` (ISO time) returns only newer ones.
const loadMessages = async (agentId, after) => {
  const where = { agentId };
  if (after) {
    const date = new Date(after);
    if (!isNaN(date.getTime())) where.createdAt = { [Op.gt]: date };
  }
  const rows = await ChatMessage.findAll({ where, include, order: [['createdAt', 'DESC']], limit: PAGE });
  return rows.reverse().map(format);
};

// Mark what the other side wrote as read
const markRead = (agentId, fromAgent) =>
  ChatMessage.update({ readAt: new Date() }, { where: { agentId, fromAgent, readAt: null } });

// Tell the other side, but only for the first unread message so a busy chat does not flood inboxes or email
const notifyOnce = async ({ agentId, fromAgent, recipients, title, message, relatedId }) => {
  const unread = await ChatMessage.count({ where: { agentId, fromAgent, readAt: null } });
  if (unread > 1) return;
  for (const recipient of recipients) {
    await createNotification({ recipient, title, message, type: 'info', relatedId, relatedModel: 'Chat' });
  }
};

const staffToNotify = async (agent) => {
  if (agent.accountManagerId) return [agent.accountManagerId];
  const admins = await User.findAll({
    where: { role: 'admin', status: 'active', [Op.or]: [{ staffRole: null }, { staffRole: 'head_admission' }] },
    attributes: ['id']
  });
  return admins.map((a) => a.id);
};

const clean = (body) => (typeof body === 'string' ? body.trim() : '');

// ── Agent side ──

exports.getMine = async (req, res) => {
  try {
    const messages = await loadMessages(req.user.id, req.query.after);
    if (req.query.markRead !== 'false') await markRead(req.user.id, false);
    res.json({ messages, whatsappUrl: whatsappUrl() });
  } catch (error) {
    console.error('Chat load error:', error);
    fail(res, 500, 'Server error');
  }
};

exports.sendMine = async (req, res) => {
  try {
    const body = clean(req.body.body);
    if (!body) return fail(res, 400, 'Write a message first');
    if (body.length > MAX_LENGTH) return fail(res, 400, `A message can be at most ${MAX_LENGTH} characters`);

    const message = await ChatMessage.create({ agentId: req.user.id, senderId: req.user.id, fromAgent: true, body });
    const recipients = await staffToNotify(req.user);
    await notifyOnce({
      agentId: req.user.id,
      fromAgent: true,
      recipients,
      title: 'New chat message',
      message: `${req.user.name}: ${body.length > 100 ? `${body.slice(0, 97)}...` : body}`,
      relatedId: req.user.id
    });
    res.status(201).json(format({ ...message.toJSON(), sender: { name: req.user.name } }));
  } catch (error) {
    console.error('Chat send error:', error);
    fail(res, 500, 'Server error');
  }
};

exports.unreadMine = async (req, res) => {
  try {
    const count = await ChatMessage.count({ where: { agentId: req.user.id, fromAgent: false, readAt: null } });
    res.json({ unread: count });
  } catch (error) {
    fail(res, 500, 'Server error');
  }
};

// ── Staff side ──

exports.conversations = async (req, res) => {
  try {
    const ids = await getScopedAgentIds(req.user);
    const scope = ids === null ? '' : 'AND m."agentId" IN (:ids)';
    if (ids !== null && ids.length === 0) return res.json({ conversations: [], unread: 0 });

    // Latest message and unread count per agent
    const rows = await sequelize.query(
      `SELECT m."agentId",
              MAX(m."createdAt") AS "lastAt",
              COUNT(*) FILTER (WHERE m."fromAgent" = true AND m."readAt" IS NULL) AS "unread"
         FROM "ChatMessages" m
        WHERE 1 = 1 ${scope}
        GROUP BY m."agentId"
        ORDER BY "lastAt" DESC`,
      { replacements: { ids: ids || [] }, type: sequelize.QueryTypes.SELECT }
    );
    if (rows.length === 0) return res.json({ conversations: [], unread: 0 });

    const agents = await User.findAll({
      where: { id: rows.map((r) => r.agentId) },
      attributes: ['id', 'name', 'email', 'agencyName', 'phone']
    });
    const byId = Object.fromEntries(agents.map((a) => [a.id, a]));
    const lasts = await ChatMessage.findAll({
      where: { [Op.or]: rows.map((r) => ({ agentId: r.agentId, createdAt: r.lastAt })) }
    });
    const lastBy = Object.fromEntries(lasts.map((m) => [m.agentId, m]));

    const conversations = rows.map((r) => ({
      agentId: r.agentId,
      agentName: byId[r.agentId] ? byId[r.agentId].name : 'Agent',
      agencyName: byId[r.agentId] ? byId[r.agentId].agencyName : null,
      whatsappUrl: byId[r.agentId] ? waLink(byId[r.agentId].phone) : null,
      lastMessage: lastBy[r.agentId] ? lastBy[r.agentId].body : '',
      lastFromAgent: lastBy[r.agentId] ? lastBy[r.agentId].fromAgent : false,
      lastAt: r.lastAt,
      unread: parseInt(r.unread, 10) || 0
    }));
    res.json({ conversations, unread: conversations.reduce((sum, c) => sum + c.unread, 0) });
  } catch (error) {
    console.error('Chat conversations error:', error);
    fail(res, 500, 'Server error');
  }
};

// Agents the staff member may start a chat with (for a new conversation)
exports.agents = async (req, res) => {
  try {
    const where = { role: 'agent', status: 'active' };
    const ids = await getScopedAgentIds(req.user);
    if (ids !== null) where.id = { [Op.in]: ids };
    const agents = await User.findAll({ where, attributes: ['id', 'name', 'agencyName', 'phone'], order: [['name', 'ASC']], limit: 500 });
    res.json(agents.map((a) => ({ id: a.id, name: a.name, agencyName: a.agencyName, whatsappUrl: waLink(a.phone) })));
  } catch (error) {
    fail(res, 500, 'Server error');
  }
};

const loadAgent = async (req, res) => {
  const { agentId } = req.params;
  if (!isUuid(agentId)) { fail(res, 400, 'Invalid agent id'); return null; }
  const agent = await User.findOne({ where: { id: agentId, role: 'agent' } });
  if (!agent) { fail(res, 404, 'Agent not found'); return null; }
  if (!(await canAccessAgent(req.user, agent.id))) {
    fail(res, 403, 'Access denied. This agent is not assigned to you.');
    return null;
  }
  return agent;
};

exports.getConversation = async (req, res) => {
  try {
    const agent = await loadAgent(req, res);
    if (!agent) return;
    const messages = await loadMessages(agent.id, req.query.after);
    if (req.query.markRead !== 'false') await markRead(agent.id, true);
    res.json({ agent: { id: agent.id, name: agent.name, agencyName: agent.agencyName, whatsappUrl: waLink(agent.phone) }, messages });
  } catch (error) {
    console.error('Chat conversation error:', error);
    fail(res, 500, 'Server error');
  }
};

exports.reply = async (req, res) => {
  try {
    const agent = await loadAgent(req, res);
    if (!agent) return;
    const body = clean(req.body.body);
    if (!body) return fail(res, 400, 'Write a message first');
    if (body.length > MAX_LENGTH) return fail(res, 400, `A message can be at most ${MAX_LENGTH} characters`);

    const message = await ChatMessage.create({ agentId: agent.id, senderId: req.user.id, fromAgent: false, body });
    await notifyOnce({
      agentId: agent.id,
      fromAgent: false,
      recipients: [agent.id],
      title: 'New message from QStudy',
      message: body.length > 100 ? `${body.slice(0, 97)}...` : body,
      relatedId: agent.id
    });
    res.status(201).json(format({ ...message.toJSON(), sender: { name: req.user.name } }));
  } catch (error) {
    console.error('Chat reply error:', error);
    fail(res, 500, 'Server error');
  }
};

// WhatsApp click-to-chat link for a phone number (digits only, with country code)
function waLink(phone, text) {
  const number = String(phone || '').replace(/\D/g, '');
  if (number.length < 8) return null;
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

// Agents open the QStudy number from the settings
function whatsappUrl() {
  return waLink(process.env.WHATSAPP_NUMBER, process.env.WHATSAPP_MESSAGE || 'Hello QStudy, I need help with the agent portal.');
}

// Staff get no link here: they open the selected agent's own number in the chat
exports.config = (req, res) => res.json({ whatsappUrl: req.user.role === 'agent' ? whatsappUrl() : null });
