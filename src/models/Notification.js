const mongoose = require('mongoose');

// Check if the model exists before defining it
const Notification = mongoose.models.Notification || mongoose.model('Notification', new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['message', 'connection', 'system']
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  onModel: {
    type: String,
    required: true,
    enum: ['Chat', 'ConnectionRequest', 'User']
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}));

module.exports = Notification;