const mongoose = require('mongoose');
const { getModel } = require('../config/db');

const ProjectSchema = new mongoose.Schema({
  weddingName: {
    type: String,
    required: true
  },
  brideName: {
    type: String,
    required: true
  },
  groomName: {
    type: String,
    required: true
  },
  weddingDate: {
    type: Date,
    required: true
  },
  venue: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      role: {
        type: String,
        enum: ['Owner', 'Manager', 'Coordinator', 'Staff'],
        default: 'Staff'
      }
    }
  ],
  status: {
    type: String,
    enum: ['Planning', 'Ongoing', 'Completed'],
    default: 'Planning'
  }
}, {
  timestamps: true
});

const MongooseProjectModel = mongoose.model('Project', ProjectSchema);

module.exports = getModel('Project', MongooseProjectModel);
