const express = require('express');
const router = express.Router();
const {
  getComments,
  addComment
} = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure all routes

router.route('/')
  .post(addComment);

router.route('/:taskId')
  .get(getComments);

module.exports = router;
