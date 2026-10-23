const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { ChatMessage, User } = require('../models');
const { isUuid } = require('../utils/universityContent');
const { canAccessAgent, getScopedAgentIds, isAccountManager } = require('../utils/agentScope');
const { createNotification } = require('./notificationController');

// Live chat between an agent and QStudy, in two separate channels (one conversation per agent in each):
//   direct  - the agent and their own Account Manager. The super admin can read it (monitor) but not write.
//   support - the general helpdesk. Handled by the Head of Admission and the super admin; no other staff role has access.
// Access follows the client's access matrix. The chat is plain polling (the screens ask every few
// seconds); no extra server is needed.

const CHANNELS = ['direct', 'support'];
const MAX_LENGTH = 2000;
const PAGE = 100;

const fail = (res, status, detail) => res.status(status).json({ success: false, detail });

const isSuperAdmin = (user) => user.role === 'admin' && !user.staffRole;

// Staff roles that answer the general helpdesk (null is the super admin)
const SUPPORT_STAFF_ROLES = [null, 'head_admission'];

// What a staff member may do in a channel: { read, write }
const staffAccess = (user, channel) => {
  if (user.role !== 'admin') return { read: false, write: false };
  if (channel === 'direct') {
    if (isAccountManager(user)) return { read: true, write: true };
    if (isSuperAdmin(user)) return { read: true, write: false };
    return { read: false, write: false };
  }
  // support helpdesk
  return SUPPORT_STAFF_ROLES.includes(user.staffRole || null) ? { read: true, write: true } : { read: false, write: false };
};

// Reads ?channel= / body.channel; missing means the direct channel
const channelOf = (req) => {
  const value = (req.query && req.query.channel) || (req.body && req.body.channel) || 'direct';
  return CHANNELS.includes(value) ? value : null;
};

const format = (m) => ({
  id: m.id,
  agentId: m.agentId,
  channel: m.channel,
  senderId: m.senderId,
  senderName: m.sender ? m.sender.name : null,
  fromAgent: m.fromAgent,
  body: m.body,
  readAt: m.readAt,
  createdAt: m.createdAt
});

const include = [{ model: User, as: 'sender', attributes: ['id', 'name'] }];

// Messages of one conversation, oldest first. `after` (ISO time) returns only newer ones.
const loadMessages = async (agentId, channel, after) => {
  const where = { agentId, channel };
  if (after) {
    const date = new Date(after);
    if (!isNaN(date.getTime())) where.createdAt = { [Op.gt]: date };
  }
  const rows = await ChatMessage.findAll({ where, include, order: [['createdAt', 'DESC']], limit: PAGE });
  return rows.reverse().map(format);
};

// Mark what the other side wrote as read
const markRead = (agentId, channel, fromAgent) =>
  ChatMessage.update({ readAt: new Date() }, { where: { agentId, channel, fromAgent, readAt: null } });

// Tell the other side, but only for the first unread message so a busy chat does not flood inboxes or email
const notifyOnce = async ({ agentId, channel, fromAgent, recipients, title, message, relatedId }) => {
  const unread = await ChatMessage.count({ where: { agentId, channel, fromAgent, readAt: null } });
  if (unread > 1) return;
  for (const recipient of recipients) {
    await createNotification({ recipient, title, message, type: 'info', relatedId, relatedModel: 'Chat' });
  }
};

// The agent's active Account Manager, or null when none is assigned
const getAccountManager = async (agent) => {
  if (!agent.accountManagerId) return null;
  return User.findOne({
    where: { id: agent.accountManagerId, role: 'admin', staffRole: 'account_manager', status: 'active' },
    attributes: ['id', 'name']
  });
};

const staffToNotify = async (agent, channel) => {
  if (channel === 'direct') {
    const manager = await getAccountManager(agent);
    return manager ? [manager.id] : [];
  }
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
    const channel = channelOf(req);
    if (!channel) return fail(res, 400, 'Unknown chat channel');
    const manager = await getAccountManager(req.user);
    const messages = await loadMessages(req.user.id, channel, req.query.after);
    if (req.query.markRead !== 'false') await markRead(req.user.id, channel, false);
    res.json({
      messages,
      channel,
      accountManager: manager ? { id: manager.id, name: manager.name } : null,
      whatsappUrl: whatsappUrl()
    });
  } catch (error) {
    console.error('Chat load error:', error);
    fail(res, 500, 'Server error');
  }
};

exports.sendMine = async (req, res) => {
  try {
    const channel = channelOf(req);
    if (!channel) return fail(res, 400, 'Unknown chat channel');
    const body = clean(req.body.body);
    if (!body) return fail(res, 400, 'Write a message first');
    if (body.length > MAX_LENGTH) return fail(res, 400, `A message can be at most ${MAX_LENGTH} characters`);

    const recipients = await staffToNotify(req.user, channel);
    if (channel === 'direct' && recipients.length === 0) {
      return fail(res, 400, 'You do not have an Account Manager yet. Use General Support for now.');
    }

    const message = await ChatMessage.create({ agentId: req.user.id, channel, senderId: req.user.id, fromAgent: true, body });
    await notifyOnce({
      agentId: req.user.id,
      channel,
      fromAgent: true,
      recipients,
      title: channel === 'direct' ? 'New chat message' : 'New support chat message',
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
    const rows = await ChatMessage.findAll({
      where: { agentId: req.user.id, fromAgent: false, readAt: null },
      attributes: ['channel', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['channel'],
      raw: true
    });
    const byChannel = { direct: 0, support: 0 };
    rows.forEach((r) => { byChannel[r.channel] = parseInt(r.count, 10) || 0; });
    res.json({ unread: byChannel.direct + byChannel.support, ...byChannel });
  } catch (error) {
    fail(res, 500, 'Server error');
  }
};

// ── Staff side ──

// Which channels this staff member can open, and whether they can write in each
exports.access = (req, res) => {
  res.json({
    direct: staffAccess(req.user, 'direct'),
    support: staffAccess(req.user, 'support')
  });
};

exports.conversations = async (req, res) => {
  try {
    const channel = channelOf(req);
    if (!channel) return fail(res, 400, 'Unknown chat channel');
    if (!staffAccess(req.user, channel).read) return fail(res, 403, 'You do not have access to this chat.');

    const ids = await getScopedAgentIds(req.user);
    const scope = ids === null ? '' : 'AND m."agentId" IN (:ids)';
    if (ids !== null && ids.length === 0) return res.json({ conversations: [], unread: 0 });

    // Latest message and unread count per agent
    const rows = await sequelize.query(
      `SELECT m."agentId",
              MAX(m."createdAt") AS "lastAt",
              COUNT(*) FILTER (WHERE m."fromAgent" = true AND m."readAt" IS NULL) AS "unread"
         FROM "ChatMessages" m
        WHERE m."channel" = :channel ${scope}
        GROUP BY m."agentId"
        ORDER BY "lastAt" DESC`,
      { replacements: { ids: ids || [], channel }, type: sequelize.QueryTypes.SELECT }
    );
    if (rows.length === 0) return res.json({ conversations: [], unread: 0 });

    const agents = await User.findAll({
      where: { id: rows.map((r) => r.agentId) },
      attributes: ['id', 'name', 'email', 'agencyName', 'phone']
    });
    const byId = Object.fromEntries(agents.map((a) => [a.id, a]));
    const lasts = await ChatMessage.findAll({
      where: { channel, [Op.or]: rows.map((r) => ({ agentId: r.agentId, createdAt: r.lastAt })) }
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
    const channel = channelOf(req);
    if (!channel) return fail(res, 400, 'Unknown chat channel');
    const access = staffAccess(req.user, channel);
    if (!access.read) return fail(res, 403, 'You do not have access to this chat.');
    // Starting a conversation means writing the first message
    if (!access.write) return res.json([]);

    const where = { role: 'agent', status: 'active' };
    const ids = await getScopedAgentIds(req.user);
    if (ids !== null) where.id = { [Op.in]: ids };
    const agents = await User.findAll({ where, attributes: ['id', 'name', 'agencyName', 'phone'], order: [['name', 'ASC']], limit: 500 });
    res.json(agents.map((a) => ({ id: a.id, name: a.name, agencyName: a.agencyName, whatsappUrl: waLink(a.phone) })));
  } catch (error) {
    fail(res, 500, 'Server error');
  }
};

const loadAgent = async (req, res, channel, needWrite) => {
  const { agentId } = req.params;
  if (!isUuid(agentId)) { fail(res, 400, 'Invalid agent id'); return null; }
  const access = staffAccess(req.user, channel);
  if (!access.read || (needWrite && !access.write)) {
    fail(res, 403, needWrite && access.read ? 'This chat is read-only for your role.' : 'You do not have access to this chat.');
    return null;
  }
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
    const channel = channelOf(req);
    if (!channel) return fail(res, 400, 'Unknown chat channel');
    const agent = await loadAgent(req, res, channel, false);
    if (!agent) return;
    const access = staffAccess(req.user, channel);
    const messages = await loadMessages(agent.id, channel, req.query.after);
    // Only someone who can answer marks the agent's messages read; a monitoring super admin must not clear the Account Manager's unread count
    if (access.write && req.query.markRead !== 'false') await markRead(agent.id, channel, true);
    res.json({
      agent: { id: agent.id, name: agent.name, agencyName: agent.agencyName, whatsappUrl: waLink(agent.phone) },
      channel,
      canWrite: access.write,
      messages
    });
  } catch (error) {
    console.error('Chat conversation error:', error);
    fail(res, 500, 'Server error');
  }
};

exports.reply = async (req, res) => {
  try {
    const channel = channelOf(req);
    if (!channel) return fail(res, 400, 'Unknown chat channel');
    const agent = await loadAgent(req, res, channel, true);
    if (!agent) return;
    const body = clean(req.body.body);
    if (!body) return fail(res, 400, 'Write a message first');
    if (body.length > MAX_LENGTH) return fail(res, 400, `A message can be at most ${MAX_LENGTH} characters`);

    const message = await ChatMessage.create({ agentId: agent.id, channel, senderId: req.user.id, fromAgent: false, body });
    await notifyOnce({
      agentId: agent.id,
      channel,
      fromAgent: false,
      recipients: [agent.id],
      title: channel === 'direct' ? 'New message from your Account Manager' : 'New message from QStudy support',
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
