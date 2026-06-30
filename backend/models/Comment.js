const mongoose = require('mongoose');
const { getModel } = require('../config/db');

const CommentSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  }
}, {
  timestamps: true // This automatically gives us createdAt and updatedAt
});

const MongooseCommentModel = mongoose.model('Comment', CommentSchema);

module.exports = getModel('Comment', MongooseCommentModel);
