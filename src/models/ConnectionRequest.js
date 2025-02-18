const mongoose = require("mongoose");
const Ticket = require('../models/Ticket');
const connectionRequestSchema = new mongoose.Schema({
  fromUserId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  toUserId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  ticketId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Ticket', 
    required: true,
    index: true 
  },
  status: { 
    type: String, 
    enum: ['interested', 'accepted', 'rejected', 'archived', 'pending_archive'],
    default: 'interested',
    index: true
  },
  archiveScheduledAt: {
    type: Date
  },
  archivedAt: {
    type: Date
  }
}, { 
  timestamps: true 
});

// Optimized compound index
connectionRequestSchema.index({ fromUserId: 1, toUserId: 1, ticketId: 1 }, { unique: true });

// Pre-save validation
connectionRequestSchema.pre("save", async function(next) {
  if (this.fromUserId.equals(this.toUserId)) {
    throw new Error("Cannot send request to yourself");
  }

  if (this.isNew) {
    const ticket = await Ticket.findById(this.ticketId).lean();
    if (!ticket?.isAvailable) throw new Error("Ticket unavailable");
  }
  
  if (this.isModified('status') && this.status === 'archived') {
    this.archivedAt = new Date();
  }
  
  next();
});

// Static method for handling purchases
connectionRequestSchema.statics.handleTicketPurchase = async function(ticketId, buyerId) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Update ticket and archive all related requests atomically
    const [ticket] = await Promise.all([
      Ticket.findByIdAndUpdate(
        ticketId,
        { isAvailable: false, buyerId, soldAt: new Date() },
        { new: true, session }
      ),
      this.updateMany(
        { ticketId },
        { status: 'archived', archivedAt: new Date() },
        { session }
      )
    ]);

    if (!ticket) throw new Error('Ticket not found');
    
    await session.commitTransaction();
    return ticket;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Instance methods
connectionRequestSchema.methods = {
  async accept() {
    if (this.status !== 'interested') throw new Error('Invalid status transition');
    this.status = 'accepted';
    return this.save();
  },

  async reject() {
    if (this.status !== 'interested') throw new Error('Invalid status transition');
    this.status = 'rejected';
    return this.save();
  },

  async archive() {
    if (this.status === 'archived') throw new Error('Already archived');
    this.status = 'archived';
    return this.save();
  }
};

const ConnectionRequest = mongoose.model("ConnectionRequest", connectionRequestSchema);
module.exports = ConnectionRequest;