const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  event: { 
    type: String, 
    required: true,
    index: true
  },
  eventData: { 
    type: Object 
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    platform: String
  }
}, { 
  timestamps: true 
});

// Compound index for common queries
analyticsSchema.index({ userId: 1, event: 1, createdAt: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);