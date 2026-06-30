const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const { getIsFallback } = require('../config/db');

// Helper to manually populate project creator and members (essential for JSON Fallback)
const populateProject = async (project) => {
  if (!project) return null;
  
  // Clone object
  const projectObj = JSON.parse(JSON.stringify(project));
  
  // Populate createdBy
  if (projectObj.createdBy) {
    const creator = await User.findById(projectObj.createdBy);
    if (creator) {
      projectObj.createdBy = {
        _id: creator._id,
        name: creator.name,
        email: creator.email,
        role: creator.role,
        avatar: creator.avatar
      };
    }
  }

  // Populate members user info
  if (projectObj.members && Array.isArray(projectObj.members)) {
    for (let i = 0; i < projectObj.members.length; i++) {
      const userId = projectObj.members[i].user || projectObj.members[i].userId;
      if (userId) {
        const memberUser = await User.findById(userId);
        if (memberUser) {
          projectObj.members[i].user = {
            _id: memberUser._id,
            name: memberUser.name,
            email: memberUser.email,
            role: memberUser.role,
            avatar: memberUser.avatar
          };
        }
      }
    }
  }

  return projectObj;
};

// @desc    Get all projects for logged in user
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
  try {
    const fallback = getIsFallback();
    let projects;

    if (fallback) {
      const allProjects = await Project.find({});
      projects = allProjects.filter(p => 
        String(p.createdBy) === String(req.user._id) || 
        (p.members && p.members.some(m => String(m.user || m.userId) === String(req.user._id)))
      );
    } else {
      // Mongoose native populate
      projects = await Project.find({
        $or: [
          { createdBy: req.user._id },
          { 'members.user': req.user._id }
        ]
      });
    }

    const populatedProjects = [];
    for (const project of projects) {
      const populated = await populateProject(project);
      populatedProjects.push(populated);
    }

    res.json(populatedProjects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error fetching projects' });
  }
};

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    const isCreator = String(project.createdBy) === String(req.user._id);
    const isMember = project.members && project.members.some(m => String(m.user || m.userId) === String(req.user._id));

    if (!isCreator && !isMember) {
      return res.status(403).json({ message: 'Not authorized to view this project' });
    }

    const populated = await populateProject(project);
    res.json(populated);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error fetching project details' });
  }
};

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
  const { weddingName, brideName, groomName, weddingDate, venue, description } = req.body;

  try {
    if (!weddingName || !brideName || !groomName || !weddingDate || !venue) {
      return res.status(400).json({ message: 'Please add all required fields' });
    }

    const project = await Project.create({
      weddingName,
      brideName,
      groomName,
      weddingDate,
      venue,
      description: description || '',
      createdBy: req.user._id,
      status: 'Planning',
      members: [
        {
          user: req.user._id,
          role: 'Owner'
        }
      ]
    });

    const populated = await populateProject(project);
    res.status(201).json(populated);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error creating project' });
  }
};

// @desc    Update project details
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = async (req, res) => {
  const { weddingName, brideName, groomName, weddingDate, venue, description, status } = req.body;

  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization: Owner or Manager/Coordinator
    const isCreator = String(project.createdBy) === String(req.user._id);
    const userMember = project.members.find(m => String(m.user || m.userId) === String(req.user._id));
    const isAuthorized = isCreator || (userMember && ['Owner', 'Manager', 'Coordinator'].includes(userMember.role));

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to update this project' });
    }

    const updateData = {};
    if (weddingName) updateData.weddingName = weddingName;
    if (brideName) updateData.brideName = brideName;
    if (groomName) updateData.groomName = groomName;
    if (weddingDate) updateData.weddingDate = weddingDate;
    if (venue) updateData.venue = venue;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    const populated = await populateProject(updatedProject);
    
    // Notify room of update via Socket.IO
    if (global.io) {
      global.io.to(req.params.id).emit('projectUpdated', populated);
    }

    res.json(populated);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error updating project' });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only creator (Owner) can delete
    const isCreator = String(project.createdBy) === String(req.user._id);
    if (!isCreator) {
      return res.status(403).json({ message: 'Only the project creator can delete it' });
    }

    await Project.findByIdAndDelete(req.params.id);

    // Cascading deletes for tasks and comments
    const tasks = await Task.find({ projectId: req.params.id });
    const taskIds = tasks.map(t => t._id);

    await Task.deleteMany({ projectId: req.params.id });
    await Comment.deleteMany({ taskId: { $in: taskIds } });

    // Notify room via Socket.IO
    if (global.io) {
      global.io.to(req.params.id).emit('projectDeleted', { projectId: req.params.id });
    }

    res.json({ message: 'Project and all associated tasks deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error deleting project' });
  }
};

// @desc    Add member to project
// @route   POST /api/projects/:id/members
// @access  Private
const addProjectMember = async (req, res) => {
  const { email, role } = req.body;

  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization: Owner or Manager
    const isCreator = String(project.createdBy) === String(req.user._id);
    const userMember = project.members.find(m => String(m.user || m.userId) === String(req.user._id));
    const isAuthorized = isCreator || (userMember && ['Owner', 'Manager'].includes(userMember.role));

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to invite members' });
    }

    // Find user to invite
    const invitedUser = await User.findOne({ email });
    if (!invitedUser) {
      return res.status(404).json({ message: 'No user found with this email address' });
    }

    // Check if already in members
    const isAlreadyMember = project.members.some(
      m => String(m.user || m.userId) === String(invitedUser._id)
    );
    if (isAlreadyMember) {
      return res.status(400).json({ message: 'User is already a member of this project' });
    }

    // Add member
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          members: {
            user: invitedUser._id,
            role: role || 'Staff'
          }
        }
      },
      { new: true }
    );

    const populated = await populateProject(updatedProject);
    
    if (global.io) {
      global.io.to(req.params.id).emit('projectUpdated', populated);
    }

    res.json(populated);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Server error adding team member' });
  }
};

// @desc    Remove member from project
// @route   DELETE /api/projects/:id/members/:userId
// @access  Private
const removeProjectMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    const isCreator = String(project.createdBy) === String(req.user._id);
    const userMember = project.members.find(m => String(m.user || m.userId) === String(req.user._id));
    const isAuthorized = isCreator || (userMember && ['Owner', 'Manager'].includes(userMember.role));

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to remove members' });
    }

    // Check if target is project owner (cannot remove owner)
    if (String(project.createdBy) === String(req.params.userId)) {
      return res.status(400).json({ message: 'Cannot remove the project owner' });
    }

    // Pull from members array
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      {
        $pull: {
          members: { user: req.params.userId }
        }
      },
      { new: true }
    );

    const populated = await populateProject(updatedProject);

    if (global.io) {
      global.io.to(req.params.id).emit('projectUpdated', populated);
      // Notify the removed user specifically
      global.io.to(req.params.userId).emit('removedFromProject', { projectId: req.params.id });
    }

    res.json(populated);
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error removing member' });
  }
};

// @desc    Update project member role
// @route   PUT /api/projects/:id/members/:userId
// @access  Private
const updateProjectMemberRole = async (req, res) => {
  const { role } = req.body;

  try {
    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    const isCreator = String(project.createdBy) === String(req.user._id);
    const userMember = project.members.find(m => String(m.user || m.userId) === String(req.user._id));
    const isAuthorized = isCreator || (userMember && ['Owner', 'Manager'].includes(userMember.role));

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to change roles' });
    }

    // Find and update role in members array
    const updatedMembers = project.members.map(m => {
      if (String(m.user || m.userId) === String(req.params.userId)) {
        m.role = role;
      }
      return m;
    });

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: { members: updatedMembers } },
      { new: true }
    );

    const populated = await populateProject(updatedProject);

    if (global.io) {
      global.io.to(req.params.id).emit('projectUpdated', populated);
    }

    res.json(populated);
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ message: 'Server error updating member role' });
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  updateProjectMemberRole
};
