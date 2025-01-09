const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      match: [/^\+?[1-9]\d{9,14}$/, 'Please enter a valid phone number'],
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String, // Store hashed OTP for phone verification
    },
    otpExpires: {
      type: Date, // OTP expiration time
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      // enum: ['buyer', 'seller'],
      enum: {
        values: ["buyer", "seller"],
            message: `{VALUE} is not a valid Role type`,
    },
      required: true,
      default: 'buyer',
    },
    ratings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Rating',
      },
    ],
    averageRating: {
      type: Number,
      default: 0,
    },
    ticketsSold: {
      type: Number,
      default: 0,
    },
    ticketsAllowed: {
      type: Number,
      default: 2, // Default for new sellers
    },
    accountStatus: {
      type: String,
      enum: ['active', 'warned', 'blocked'],
      default: 'active',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Pre-save hook to update the 'updatedAt' field before saving
userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);
