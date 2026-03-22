const mongoose = require('mongoose');
const crypto = require('crypto');

const cliTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    default: 'CLI Token'
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  revoked: {
    type: Boolean,
    default: false
  }
});

// Static method to generate secure token
cliTokenSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

// Static method to hash token
cliTokenSchema.statics.hashToken = function(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Instance method to check if token is expired
cliTokenSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Instance method to check if token is valid
cliTokenSchema.methods.isValid = function() {
  return !this.revoked && !this.isExpired();
};

module.exports = mongoose.model('CliToken', cliTokenSchema);
