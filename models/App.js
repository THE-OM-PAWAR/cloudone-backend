const mongoose = require('mongoose');

const appSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['automation', 'ai', 'database', 'analytics', 'cms', 'other'],
    index: true
  },
  logo: {
    type: String,
    default: ''
  },
  deploymentType: {
    type: String,
    required: true,
    enum: ['docker', 'compose']
  },
  dockerImage: {
    type: String,
    required: function() {
      return this.deploymentType === 'docker';
    }
  },
  defaultPort: {
    type: Number,
    required: true,
    min: 1,
    max: 65535
  },
  env: [{
    key: {
      type: String,
      required: true
    },
    value: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    required: {
      type: Boolean,
      default: false
    }
  }],
  resources: {
    cpu: {
      type: String,
      default: '1.0',
      validate: {
        validator: function(v) {
          return /^\d+(\.\d+)?$/.test(v);
        },
        message: 'CPU must be a valid number (e.g., "1.0", "0.5")'
      }
    },
    memory: {
      type: String,
      default: '512m',
      validate: {
        validator: function(v) {
          return /^\d+(m|g)$/i.test(v);
        },
        message: 'Memory must be in format like "512m" or "1g"'
      }
    }
  },
  composeYaml: {
    type: String,
    required: function() {
      return this.deploymentType === 'compose';
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  deployCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
appSchema.index({ category: 1, isActive: 1 });
appSchema.index({ slug: 1, isActive: 1 });

// Increment deploy count
appSchema.methods.incrementDeployCount = async function() {
  this.deployCount += 1;
  await this.save();
};

module.exports = mongoose.model('App', appSchema);
