const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  totalViews: {
    type: Number,
    default: 0
  },
  uniqueVisitors: {
    type: Number,
    default: 0
  },
  visitorIds: [{
    type: String,
    index: true
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create a static method to track unique visitors
analyticsSchema.statics.trackVisitor = async function(visitorId) {
  const analytics = await this.findOne();
  
  if (!analytics) {
    return this.create({
      totalViews: 1,
      uniqueVisitors: 1,
      visitorIds: [visitorId]
    });
  }

  // Check if this is a unique visitor
  if (!analytics.visitorIds.includes(visitorId)) {
    analytics.uniqueVisitors += 1;
    analytics.visitorIds.push(visitorId);
  }
  
  analytics.totalViews += 1;
  analytics.lastUpdated = new Date();
  return analytics.save();
};

module.exports = mongoose.model('Analytics', analyticsSchema);