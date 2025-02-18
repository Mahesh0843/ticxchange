const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  participants: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    validate: {
      validator: function(arr) {
        return Array.isArray(arr) && arr.length === 2;
      },
      message: 'Chat must have exactly 2 participants'
    }
  },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  messages: [messageSchema]
}, {
  timestamps: true
});

// Create a compound index that ensures uniqueness for the specific pair of participants and ticket
chatSchema.index({ 
  'participants': 1, 
  'ticketId': 1 
}, { 
  unique: true,
  partialFilterExpression: { 
    'participants': { $size: 2 } 
  } 
});

// Pre-save middleware to sort participants array
chatSchema.pre('save', function(next) {
  if (this.participants) {
    // Sort participants by their string representation
    this.participants.sort((a, b) => a.toString().localeCompare(b.toString()));
  }
  next();
});

// Static method to find or create chat
chatSchema.statics.findOrCreateChat = async function(userObjectId, targetObjectId, ticketObjectId) {
  // Sort participants for consistency
  const participants = [userObjectId, targetObjectId].sort((a, b) => 
    a.toString().localeCompare(b.toString())
  );
  
  try {
    // Try to find existing chat
    let chat = await this.findOne({
      participants: { $all: participants },
      ticketId: ticketObjectId
    });

    // If no chat exists, create new one
    if (!chat) {
      chat = new this({
        participants,
        ticketId: ticketObjectId,
        messages: []
      });
      await chat.save();
    }

    return chat;
  } catch (error) {
    // If error is not a duplicate key error, throw it
    if (error.code !== 11000) {
      throw error;
    }
    // If duplicate key error, try to find the existing chat again
    return await this.findOne({
      participants: { $all: participants },
      ticketId: ticketObjectId
    });
  }
};

// Validation to prevent self-chat
chatSchema.pre('save', function(next) {
  if (this.participants && 
      this.participants.length === 2 && 
      this.participants[0].equals(this.participants[1])) {
    next(new Error('Cannot create chat with yourself'));
  }
  next();
});

// Method to check if a user is part of the chat
chatSchema.methods.isParticipant = function(userId) {
  return this.participants.some(participantId => 
    participantId.equals(userId)
  );
};

const Chat = mongoose.model('Chat', chatSchema);

// Drop the existing index if it exists
async function dropUniqueIndex() {
  try {
    await Chat.collection.dropIndex('participants_1_ticketId_1');
    console.log('Successfully dropped unique index');
  } catch (error) {
    console.log('Index might not exist, continuing...');
  }
}

dropUniqueIndex();

module.exports = Chat;