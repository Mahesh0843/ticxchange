const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const {userAuth} = require('../middleware/auth');

// Get all notifications for a user
router.get('/', userAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      recipient: req.user._id 
    })
    .sort({ createdAt: -1 })
    .limit(50);

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Error fetching notifications' });
  }
});

// Get unread count
router.get('/unread/count', userAuth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read: false
    });
    res.json({ count });
  } catch (error) {
    console.error('Error counting notifications:', error);
    res.status(500).json({ error: 'Error counting notifications' });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', userAuth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.notificationId,
        recipient: req.user._id
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Error updating notification' });
  }
});

// Delete all read notifications
router.delete('/read-all', userAuth, async (req, res) => {
  try {
    // Delete all notifications for the user
    const result = await Notification.deleteMany({
      recipient: req.user._id,
      read: true
    });

    res.json({ 
      message: 'All read notifications deleted',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    res.status(500).json({ message: 'Error deleting notifications' });
  }
});

// Mark all as read and then delete them
router.patch('/read-and-delete-all', userAuth, async (req, res) => {
  try {
    // First mark all as read
    await Notification.updateMany(
      {
        recipient: req.user._id,
        read: false
      },
      { read: true }
    );

    // Then delete all read notifications
    const result = await Notification.deleteMany({
      recipient: req.user._id,
      read: true
    });

    res.json({ 
      message: 'All notifications marked as read and deleted',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error processing notifications:', error);
    res.status(500).json({ message: 'Error processing notifications' });
  }
});

module.exports = router;