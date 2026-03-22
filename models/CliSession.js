const mongoose = require('mongoose');
const crypto = require('crypto');

const cliSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  token: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'authenticated', 'expired'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
});

// Static method to generate session ID
cliSessionSchema.statics.generateSessionId = function() {
  return crypto.randomBytes(16).toString('hex');
};

// Instance method to check if session is expired
cliSessionSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

module.exports = mongoose.model('CliSession', cliSessionSchema);
