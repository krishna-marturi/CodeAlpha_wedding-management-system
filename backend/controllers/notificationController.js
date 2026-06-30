const Notification = require('../models/Notification');

// Helper to trigger and save a new notification, broadcasting it via Socket.IO
const triggerNotification = async (userId, message) => {
  try {
    const notification = await Notification.create({
      userId,
      message,
      isRead: false
    });

    // Broadcast via Socket.IO directly to the user's specific room
    if (global.io) {
      global.io.to(`user_${String(userId)}`).emit('newNotification', notification);
    }

    return notification;
  } catch (error) {
    console.error('Trigger notification helper error:', error);
  }
};

// @desc    Get all notifications for logged in user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id });
    
    // Sort newest first
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Return only top 50 recent notifications
    res.json(notifications.slice(0, 50));
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/read/:id
// @access  Private
const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Verify ownership
    if (String(notification.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to read this notification' });
    }

    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      { $set: { isRead: true } },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    console.error('Mark read notification error:', error);
    res.status(500).json({ message: 'Server error updating notification status' });
  }
};

module.exports = {
  triggerNotification,
  getNotifications,
  markNotificationRead
};
