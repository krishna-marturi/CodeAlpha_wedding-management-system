const mongoose = require('mongoose');
const { getModel } = require('../config/db');

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const MongooseNotificationModel = mongoose.model('Notification', NotificationSchema);

module.exports = getModel('Notification', MongooseNotificationModel);
