const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { triggerNotification } = require('./notificationController');
const Comment = require('../models/Comment');

// Helper to manually populate assignedTo in task
const populateTask = async (task) => {
  if (!task) return null;
  const taskObj = JSON.parse(JSON.stringify(task));
  if (taskObj.assignedTo) {
    const user = await User.findById(taskObj.assignedTo);
    if (user) {
      taskObj.assignedTo = {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      };
    }
  }
  return taskObj;
};

// @desc    Get all tasks for a project
// @route   GET /api/tasks/:projectId
// @access  Private
const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ projectId: req.params.projectId });
    
    const populatedTasks = [];
    for (const task of tasks) {
      const populated = await populateTask(task);
      populatedTasks.push(populated);
    }
    
    res.json(populatedTasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error fetching tasks' });
  }
};

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  const { projectId, title, description, assignedTo, priority, dueDate, status } = req.body;

  try {
    if (!projectId || !title) {
      return res.status(400).json({ message: 'Project ID and Title are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const task = await Task.create({
      projectId,
      title,
      description: description || '',
      assignedTo: assignedTo || null,
      priority: priority || 'Medium',
      dueDate: dueDate || null,
      status: status || 'To Do'
    });

    const populated = await populateTask(task);

    // Socket.IO Emit
    if (global.io) {
      global.io.to(projectId).emit('taskCreated', populated);
    }

    // Trigger Notification if assigned to someone other than the creator
    if (assignedTo && String(assignedTo) !== String(req.user._id)) {
      await triggerNotification(
        assignedTo,
        `You have been assigned to task "${title}" in wedding project "${project.weddingName}"`
      );
    }

    res.status(201).json(populated);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error creating task' });
  }
};

// @desc    Update a task (supports editing details and Kanban drag-and-drop movement)
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  const { title, description, assignedTo, priority, dueDate, status } = req.body;

  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const project = await Project.findById(task.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const originalAssignee = task.assignedTo;
    const originalStatus = task.status;

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo; // can be null to unassign
    if (priority) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (status) updateData.status = status;

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    const populated = await populateTask(updatedTask);

    // Socket.IO Emit
    if (global.io) {
      global.io.to(String(task.projectId)).emit('taskUpdated', populated);
    }

    // Trigger Notifications
    // 1. If assigned to a new person
    if (assignedTo && String(assignedTo) !== String(originalAssignee)) {
      await triggerNotification(
        assignedTo,
        `You have been assigned to task "${populated.title}" in project "${project.weddingName}"`
      );
    }

    // 2. If task status changed
    if (status && status !== originalStatus) {
      // Notify assignee if someone else changed it
      if (populated.assignedTo && String(populated.assignedTo._id || populated.assignedTo) !== String(req.user._id)) {
        await triggerNotification(
          populated.assignedTo._id || populated.assignedTo,
          `Task "${populated.title}" has been moved to "${status}" in "${project.weddingName}"`
        );
      }
      
      // Notify project creator if they are not the one who changed it
      if (String(project.createdBy) !== String(req.user._id)) {
        await triggerNotification(
          project.createdBy,
          `Task "${populated.title}" status changed to "${status}" in "${project.weddingName}"`
        );
      }
    }

    res.json(populated);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error updating task' });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await Task.findByIdAndDelete(req.params.id);

    // Delete associated comments
    await Comment.deleteMany({ taskId: req.params.id });

    // Socket.IO Emit
    if (global.io) {
      global.io.to(String(task.projectId)).emit('taskDeleted', { taskId: req.params.id, projectId: task.projectId });
    }

    res.json({ message: 'Task and associated comments deleted', taskId: req.params.id });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error deleting task' });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask
};
