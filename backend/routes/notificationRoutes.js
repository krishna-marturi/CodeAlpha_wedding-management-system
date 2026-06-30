const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markNotificationRead
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure all routes

router.route('/')
  .get(getNotifications);

router.route('/read/:id')
  .put(markNotificationRead);

module.exports = router;
