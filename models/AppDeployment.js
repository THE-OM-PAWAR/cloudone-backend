const mongoose = require('mongoose');

const appDeploymentSchema = new mongoose.Schema({
  app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'App',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  projectName: {
    type: String,
    required: true,
    trim: true
  },
  subdomain: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  port: {
    type: Number,
    required: true
  },
  containerName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'deploying', 'running', 'stopped', 'failed'],
    default: 'pending',
    index: true
  },
  env: {
    type: Map,
    of: String,
    default: {}
  },
  resources: {
    cpu: String,
    memory: String
  },
  url: {
    type: String
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
appDeploymentSchema.index({ user: 1, status: 1 });
appDeploymentSchema.index({ app: 1, status: 1 });
appDeploymentSchema.index({ containerName: 1 }, { unique: true });
appDeploymentSchema.index({ projectName: 1 }, { unique: true });
appDeploymentSchema.index({ subdomain: 1 }, { unique: true });

module.exports = mongoose.model('AppDeployment', appDeploymentSchema);
