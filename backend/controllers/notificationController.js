const { Notification } = require('../models');

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
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    // Don't throw error to avoid breaking main flow
  }
};
