const express = require('express');
const analyticsRouter = express.Router();
const Analytics = require('../models/Analytics');
const { v4: uuidv4 } = require('uuid');

// Get analytics data
analyticsRouter.get('/stats', async (req, res) => {
  try {
    let analytics = await Analytics.findOne();
    
    // If no analytics document exists, create one
    if (!analytics) {
      analytics = await Analytics.create({
        totalViews: 0,
        uniqueVisitors: 0,
        visitorIds: []
      });
    }

    // Get or create visitor ID from request
    const visitorId = req.query.visitorId || uuidv4();
    
    // Track the visit
    await Analytics.trackVisitor(visitorId);

    res.json({
      success: true,
      data: {
        totalViews: analytics.totalViews,
        uniqueVisitors: analytics.uniqueVisitors,
        visitorId: visitorId
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics data'
    });
  }
});

// Reset view count (optional, protected route)
analyticsRouter.post('/views/reset', async (req, res) => {
  try {
    await Analytics.findOneAndUpdate({}, { views: 0 }, { upsert: true });
    res.json({
      success: true,
      message: 'View count reset successfully'
    });
  } catch (error) {
    console.error('Error resetting view count:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting view count'
    });
  }
});

module.exports = analyticsRouter; 