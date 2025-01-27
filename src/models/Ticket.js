// // models/Ticket.js
// const mongoose = require('mongoose');

// const ticketSchema = new mongoose.Schema({
//   ticketId: { type: String, required: true, unique: true },
//   eventName: { type: String, required: true },
//   eventDate: { type: Date, required: true },
//   seatNumber: { type: String, required: true },
//   price: { type: Number, required: true },
//   numberOfTickets: { type: Number, required: true },
//   venue: { type: String, required: true },
//   sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
//   isAvailable: { type: Boolean, default: true },
//   uniqueIdentifier: { type: String, required: true, unique: true },
//   uploadedAt: { type: Date, default: Date.now },
//   imageUrl: { type: String },
// });

// module.exports = mongoose.model('Ticket', ticketSchema);


// models/Ticket.js
const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  eventName: { type: String, required: true },
  eventDate: { type: Date, required: true },
  seatNumber: { type: String, required: true },
  price: { type: Number, required: true },
  numberOfTickets: { type: Number, required: true },
  venue: { type: String, required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isAvailable: { type: Boolean, default: true },
  uniqueIdentifier: { type: String, required: true, unique: true },
  uploadedAt: { type: Date, default: Date.now },
  imageUrl: { type: String },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
    city: { type: String }, // Add city field
  },
});

ticketSchema.index({ location: '2dsphere' }); // Enable geospatial queries.

module.exports = mongoose.model('Ticket', ticketSchema);

