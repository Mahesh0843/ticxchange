const express = require('express');
const reviewRouter = express.Router();
const { userAuth } = require('../middleware/auth');
const Rating = require('../models/Rating');
const Ticket = require('../models/Ticket');

// POST /api/ratings/create
reviewRouter.post('/ratings/create', userAuth, async (req, res) => {
  try {
    const { ticketId, rating, comment } = req.body;
    const buyerId = req.user._id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Find the ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Verify the user is the buyer
    if (ticket.buyerId.toString() !== buyerId.toString()) {
      return res.status(403).json({ error: 'Only the buyer can leave a review' });
    }

    // Check if ticket is sold
    if (ticket.status !== 'sold') {
      return res.status(400).json({ error: 'Can only review completed sales' });
    }

    // Check if already reviewed this specific ticket
    const existingRating = await Rating.findOne({
      ticketId: ticketId,
      buyerId: buyerId
    });

    if (existingRating) {
      return res.status(400).json({ error: `You have already reviewed ticket #${ticketId}` });
    }

    // Create the review
    const newRating = new Rating({
      ticketId,
      sellerId: ticket.sellerId,
      buyerId,
      rating,
      comment: comment || ''
    });

    await newRating.save();

    res.status(201).json({
      success: true,
      data: newRating
    });

  } catch (error) {
    console.error('Rating creation error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: `You have already reviewed this ticket` });
    }
    res.status(500).json({ error: 'Error creating rating' });
  }
});

// GET /api/ratings/:ticketId/check
reviewRouter.get('/ratings/:ticketId/check', userAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const buyerId = req.user._id;

    const existingRating = await Rating.findOne({ ticketId, buyerId });
    
    res.json({
      success: true,
      hasReview: !!existingRating
    });

  } catch (error) {
    console.error('Check rating error:', error);
    res.status(500).json({ error: 'Error checking rating status' });
  }
});

// GET /api/ratings/user/:userId
reviewRouter.get('/ratings/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const ratings = await Rating.find({ sellerId: userId })
      .populate('buyerId', 'firstName lastName')
      .populate('ticketId', 'eventName')
      .sort({ createdAt: -1 });

    // Calculate average rating
    const averageRating = ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length;

    res.json({
      success: true,
      data: {
        ratings,
        averageRating: ratings.length > 0 ? Number(averageRating.toFixed(1)) : 0,
        totalRatings: ratings.length
      }
    });

  } catch (error) {
    console.error('Fetch ratings error:', error);
    res.status(500).json({ error: 'Error fetching ratings' });
  }
});

module.exports = reviewRouter; 