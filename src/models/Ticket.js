// models/Ticket.js
const mongoose = require('mongoose');
const moment = require('moment');
const ticketSchema = new mongoose.Schema({
  ticketId: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  eventName: { 
    type: String, 
    required: true,
    trim: true
  },
  eventDate: { 
    type: Date, 
    required: true,
    set: (value) => moment(value).seconds(0).toDate(), // Ensures time precision
    validate: {
      validator: function(value) {
        return moment(value).isAfter(moment());
      },
      message: 'Event date must be in the future'
    }
  },
  seatNumber: { 
    type: String, 
    required: true,
    trim: true
  },
  price: { 
    type: Number, 
    required: true,
    min: [0, 'Price cannot be negative']
  },
  numberOfTickets: { 
    type: Number, 
    required: true,
    min: [1, 'Must have at least 1 ticket']
  },
  venue: { 
    type: String, 
    required: true,
    trim: true
  },
  sellerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true
  },
  buyerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  isAvailable: { 
    type: Boolean, 
    default: true
  },
  uniqueIdentifier: { 
    type: String, 
    required: true,
    unique: true
  },
  imageUrl: { 
    type: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false, // Now optional
      validate: {
        validator: function(value) {
          return !value || (Array.isArray(value) && value.length === 2);
        },
        message: 'Coordinates must be an array of [longitude, latitude] if provided',
      },
    },
    city: { 
      type: String,
      index: true // Index to allow city-based filtering
    }
  },
  // New fields for ticket status management
  status: {
    type: String,
    enum: ['available', 'pending', 'sold', 'disputed'],
    default: 'available',
    index: true
  },
  confirmedAt: {
    type: Date,
    default: null
  },
  disputeCount: {
    type: Number,
    default: 0
  },
  disputeReason: String,
  disputedAt: Date,
  soldAt: Date,
  eventType: {
    type: String,
    required: true,
    enum: ['MOVIE', 'SPORT', 'EVENT'],
    uppercase: true
  }
}, {
  timestamps: true
});

// Add a static method to clean up past event tickets
ticketSchema.statics.cleanupExpiredTickets = async function() {
  const result = await this.deleteMany({
    eventDate: { $lt: new Date() },
    status: 'available',
    isAvailable: true
  });
  console.log(`Cleaned up ${result.deletedCount} expired tickets`);
};

// Essential indexes
ticketSchema.index({ 'location.city': 'text', eventName: 'text' });
ticketSchema.index({ location: '2dsphere' });
ticketSchema.index({ status: 1, sellerId: 1 });
ticketSchema.index({ status: 1, buyerId: 1 });

const Ticket = mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;