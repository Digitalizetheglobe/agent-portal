const { Notification, User } = require('../models');
const { sendEmail, templates } = require('../utils/email');

// ── Email copy of notifications ──────────────────────────────────────────────
// Every in-app notification is also emailed to the person it is for. Agents always get the email;
// staff get it only when EMAIL_STAFF_NOTIFICATIONS=true (they work in the portal all day).
// Email problems are logged and never break the action that caused the notification.

const portalUrl = () => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

// Where "Open in the portal" goes, by who the email is for and what it is about
const linkFor = (role, { relatedModel, relatedId }) => {
  const base = `${portalUrl()}/${role === 'agent' ? 'agent' : 'admin'}`;
  const withId = (path) => (relatedId ? `${base}/${path}/${relatedId}` : `${base}/${path}`);
  switch (relatedModel) {
    case 'Application': return withId('applications');
    case 'Student': return withId('students');
    case 'University': return withId('universities');
    case 'Agent': return role === 'agent' ? `${base}/dashboard` : withId('agents');
    case 'Payoff': return `${base}/payoffs`;
    case 'Invoice': return `${base}/invoices`;
    case 'Ticket': return `${base}/support`;
    case 'Chat': return role === 'agent' ? `${base}/chat` : withId('chat');
    case 'News': return `${base}/news`;
    default: return `${base}/notifications`;
  }
};

const shouldEmail = (user) => Boolean(
  user && user.email && user.status === 'active' &&
  (user.role === 'agent' || (user.role === 'admin' && process.env.EMAIL_STAFF_NOTIFICATIONS === 'true'))
);

const emailNotification = async (data) => {
  try {
    const user = await User.findByPk(data.recipient, { attributes: ['id', 'name', 'email', 'role', 'status'] });
    if (!shouldEmail(user)) return;
    const message = templates.notification({
      name: user.name,
      title: data.title,
      message: data.message,
      link: linkFor(user.role, data)
    });
    await sendEmail(user.email, message.subject, message.html);
  } catch (error) {
    console.error('Notification email error:', error.message);
  }
};

// @desc    Get all notifications for user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { recipient: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 200
    });

    res.status(200).json(notifications.map(n => n.toJSON()));
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, detail: 'Server error' });
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        recipient: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({ success: false, detail: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json(notification.toJSON());
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, detail: 'Server error' });
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { recipient: req.user.id, isRead: false } }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, detail: 'Server error' });
  }
};

// Utility function to create a notification (to be used within other controllers)
exports.createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);
    // Email copy: not awaited, so a slow mail server never slows the action down
    emailNotification(data);
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    // Don't throw error to avoid breaking main flow
  }
};

// Notify many people at once (announcements, university updates). Creates the in-app notifications in
// one go and sends the emails a few at a time.
exports.notifyUsers = async (notifications) => {
  if (!notifications.length) return 0;
  await Notification.bulkCreate(notifications);
  (async () => {
    const BATCH = 5;
    for (let i = 0; i < notifications.length; i += BATCH) {
      await Promise.all(notifications.slice(i, i + BATCH).map(emailNotification));
    }
  })().catch((error) => console.error('Bulk notification email error:', error.message));
  return notifications.length;
};

// Notify every active, approved agent
exports.notifyAgents = async ({ title, message, type = 'info', relatedId = null, relatedModel = null }) => {
  const agents = await User.findAll({
    where: { role: 'agent', status: 'active', isVerified: true },
    attributes: ['id']
  });
  return exports.notifyUsers(agents.map(agent => ({
    recipient: agent.id, title, message, type, relatedId, relatedModel
  })));
};
