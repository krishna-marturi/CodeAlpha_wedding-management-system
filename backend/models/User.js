const mongoose = require('mongoose');
const { getModel } = require('../config/db');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['Manager', 'Coordinator', 'Staff'],
    default: 'Staff'
  },
  avatar: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const MongooseUserModel = mongoose.model('User', UserSchema);

// Exporting resolved model which toggles between Mongoose and JSON Fallback
module.exports = getModel('User', MongooseUserModel);
