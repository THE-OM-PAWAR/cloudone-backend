const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  repoOwner: {
    type: String,
    required: true,
    trim: true
  },
  repoName: {
    type: String,
    required: true,
    trim: true
  },
  branch: {
    type: String,
    default: 'main',
    trim: true
  },
  repositoryUrl: {
    type: String,
    required: true,
    trim: true
  },
  subdomain: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    sparse: true
  },
  port: {
    type: Number,
    default: 0
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'deploying', 'deployed', 'failed', 'stopped'],
    default: 'pending'
  },
  deployedUrl: {
    type: String,
    trim: true
  },
  deploymentLogs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    message: String,
    type: {
      type: String,
      enum: ['info', 'error', 'success'],
      default: 'info'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);
