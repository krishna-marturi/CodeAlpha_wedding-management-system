const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { triggerNotification } = require('./notificationController');

// Helper to manually populate userId in comment
const populateComment = async (comment) => {
  if (!comment) return null;
  const commentObj = JSON.parse(JSON.stringify(comment));
  if (commentObj.userId) {
    const user = await User.findById(commentObj.userId);
    if (user) {
      commentObj.userId = {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      };
    }
  }
  return commentObj;
};

// @desc    Get comments for a task
// @route   GET /api/comments/:taskId
// @access  Private
const getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ taskId: req.params.taskId });
    
    // Sort comments by creation date (newest first or oldest first? Trello style usually shows oldest first or newest first, let's sort oldest first so the conversation reads down)
    comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const populatedComments = [];
    for (const comment of comments) {
      const populated = await populateComment(comment);
      populatedComments.push(populated);
    }

    res.json(populatedComments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error fetching comments' });
  }
};

// @desc    Add a comment to a task
// @route   POST /api/comments
// @access  Private
const addComment = async (req, res) => {
  const { taskId, message } = req.body;

  try {
    if (!taskId || !message) {
      return res.status(400).json({ message: 'Task ID and Message are required' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const project = await Project.findById(task.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const comment = await Comment.create({
      taskId,
      userId: req.user._id,
      message
    });

    const populated = await populateComment(comment);

    // Socket.IO Emit: Broadcat comment inside task room or project room
    // Let's broadcast to the project room so any user viewing the board gets live task comment updates
    if (global.io) {
      global.io.to(String(task.projectId)).emit('commentAdded', populated);
    }

    // Trigger Notifications
    // 1. Notify assignee (if assigned and not the author)
    if (task.assignedTo && String(task.assignedTo) !== String(req.user._id)) {
      await triggerNotification(
        task.assignedTo,
        `${req.user.name} commented on your assigned task "${task.title}"`
      );
    }

    // 2. Notify project owner (if not the assignee and not the author)
    const isOwnerAssignee = String(project.createdBy) === String(task.assignedTo);
    const isOwnerAuthor = String(project.createdBy) === String(req.user._id);
    if (!isOwnerAssignee && !isOwnerAuthor) {
      await triggerNotification(
        project.createdBy,
        `${req.user.name} commented on task "${task.title}" in "${project.weddingName}"`
      );
    }

    res.status(201).json(populated);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error adding comment' });
  }
};

module.exports = {
  getComments,
  addComment
};
