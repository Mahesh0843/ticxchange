const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    ticketId: { type: String, unique: true, required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventName: { type: String, required: true },
    eventDate: { type: Date, required: true },
    seatNumber: { type: String },
    price: { type: Number, required: true },
    isAvailable: { type: Boolean, default: true },
    uploadedAt: { type: Date, default: Date.now },
    uniqueIdentifier: { type: String },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Ticket', ticketSchema);
