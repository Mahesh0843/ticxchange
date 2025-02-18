const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  buyerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true
  },
  sellerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true
  },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [500, 'Review cannot exceed 500 characters'],
    default: ''
  }
}, {
  timestamps: true
});

// Create a compound index for ticketId and buyerId to ensure one review per ticket per buyer
ratingSchema.index({ ticketId: 1, buyerId: 1 }, { unique: true });

// Remove the problematic transactionId index if it exists
ratingSchema.index({ sellerId: 1 }); // Keep this for seller ratings queries

// Calculate and update seller's average rating
ratingSchema.statics.updateSellerRating = async function(sellerId) {
  const aggregateResult = await this.aggregate([
    { $match: { sellerId: new mongoose.Types.ObjectId(sellerId) } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);

  const User = mongoose.model('User');
  if (aggregateResult.length > 0) {
    await User.findByIdAndUpdate(sellerId, {
      $set: {
        averageRating: Number(aggregateResult[0].averageRating.toFixed(1)),
        totalRatings: aggregateResult[0].totalRatings
      }
    });
  } else {
    await User.findByIdAndUpdate(sellerId, {
      $set: {
        averageRating: 0,
        totalRatings: 0
      }
    });
  }
};

// Update seller rating after save
ratingSchema.post('save', async function() {
  await this.constructor.updateSellerRating(this.sellerId);
});

// Update seller rating after remove
ratingSchema.post('remove', async function() {
  await this.constructor.updateSellerRating(this.sellerId);
});

const Rating = mongoose.model('Rating', ratingSchema);

// Drop the problematic index if it exists
Rating.collection.dropIndex('transactionId_1').catch(() => {
  // Ignore error if index doesn't exist
});

module.exports = Rating;