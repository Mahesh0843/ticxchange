// // user.model.js
// const mongoose = require('mongoose');
// const validator = require('validator');
// const bcrypt = require('bcryptjs');

// // Define bcrypt rounds (or load from environment variables)
// const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;

// const userSchema = new mongoose.Schema(
//   {
//     firstName: {
//       type: String,
//       required: [true, 'First name is required'],
//       trim: true,
//       minlength: [2, 'First name must be at least 2 characters long'],
//       maxlength: [50, 'First name cannot exceed 50 characters']
//     },
//     lastName: {
//       type: String,
//       required: [true, 'Last name is required'],
//       trim: true,
//       minlength: [2, 'Last name must be at least 2 characters long'],
//       maxlength: [50, 'Last name cannot exceed 50 characters']
//     },
//     email: {
//       type: String,
//       required: [true, 'Email is required'],
//       unique: true,
//       trim: true,
//       lowercase: true,
//       validate: [validator.isEmail, 'Please enter a valid email address']
//     },
//     phoneNumber: {
//       type: String,
//       required: true,
//       unique: true,
//       validate: {
//         validator: function (v) {
//           return /^\+91\d{10}$/.test(v); // Ensures the stored number is always in +91XXXXXXXXXX format
//         },
//         message: "Phone number must be in the format: +91XXXXXXXXXX"
//       }
//     },
//     phoneVerified: {
//       type: Boolean,
//       default: false,
//       select: false
//     },
//     photoUrl: {
//       type: String,
//       default: "https://geographyandyou.com/images/user-profile.png",
//       validate: {
//         validator: (v) => validator.isURL(v),
//         message: 'Invalid photo URL'
//       }
//     },
//     otp: {
//       code: {
//         type: String,
//         select: false
//       },
//       attempts: {
//         type: Number,
//         default: 0,
//         select: false
//       },
//       expiresAt: {
//         type: Date,
//         select: false
//       }
//     },
//     password: {
//       type: String,
//       required: [true, 'Password is required'],
//       select: false
//     },
//     role: {
//       type: String,
//       enum: {
//         values: ["buyer", "seller"],
//         message: '{VALUE} is not a valid Role type'
//       },
//       required: true,
//       default: 'buyer',
//       index: true
//     },
//     ratings: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Rating'
//       }
//     ],
//     averageRating: {
//       type: Number,
//       default: 5.0,
//       min: [1, 'Rating must be at least 1'],
//       max: [5, 'Rating cannot exceed 5']
//     },
//     sellerStats: {
//       ticketsSold: {
//         type: Number,
//         default: 0,
//         min: 0
//       },
//       ticketsAllowed: {
//         type: Number,
//         default: 2,
//         min: 0,
//         max: 10
//       },
//       isNewSeller: {
//         type: Boolean,
//         default: true
//       },
//       successfulTransactions: {
//         type: Number,
//         default: 0
//       },
//       cancelledTransactions: {
//         type: Number,
//         default: 0
//       }
//     },
//     accountStatus: {
//       type: String,
//       enum: {
//         values: ['active', 'warned', 'blocked'],
//         message: '{VALUE} is not a valid account status'
//       },
//       default: 'active',
//       index: true
//     },
//     isVerified: {
//       type: Boolean,
//       default: false
//     },
//     lastLogin: {
//       type: Date,
//       select: false
//     },
//     loginAttempts: {
//       type: Number,
//       default: 0,
//       select: false
//     },
//     lockUntil: {
//       type: Date,
//       select: false
//     }
//   },
//   {
//     timestamps: true,
//     toJSON: { virtuals: true },
//     toObject: { virtuals: true }
//   }
// );

// // Indexes
// userSchema.index({ role: 1, accountStatus: 1 }); // Compound index
// userSchema.index({ 'sellerStats.ticketsSold': -1 });
// userSchema.index({ createdAt: -1 });

// // Virtual fields
// userSchema.virtual('fullName').get(function() {
//   return `${this.firstName} ${this.lastName}`;
// });

// userSchema.virtual('accountAge').get(function() {
//   // createdAt is provided by timestamps option
//   return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
// });

// // Pre-save hook to hash password if modified and not already hashed
// userSchema.pre('save', async function(next) {
//   // Check if password is modified and is not already hashed (bcrypt hashes start with "$2")
//   if (this.isModified('password') && !this.password.startsWith('$2')) {
//     try {
//       const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
//       this.password = await bcrypt.hash(this.password, salt);
//     } catch (error) {
//       return next(error);
//     }
//   }
//   next();
// });

// // Instance methods
// userSchema.methods.comparePassword = async function(candidatePassword) {
//   try {
//     return await bcrypt.compare(candidatePassword, this.password);
//   } catch (error) {
//     throw new Error('Password comparison failed');
//   }
// };

// userSchema.methods.isLocked = function() {
//   return this.lockUntil && this.lockUntil > Date.now();
// };

// userSchema.methods.incrementLoginAttempts = async function() {
//   const updates = {};
//   const attempts = this.loginAttempts + 1;

//   // If previous lock has expired, reset the loginAttempts count
//   if (this.lockUntil && this.lockUntil < Date.now()) {
//     updates.$set = { loginAttempts: 1 };
//     updates.$unset = { lockUntil: '' };
//   } else {
//     updates.$inc = { loginAttempts: 1 };
//     if (attempts >= 5) {
//       updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // Lock for 2 hours
//     }
//   }

//   await this.constructor.updateOne({ _id: this._id }, updates);
// };

// userSchema.methods.resetLoginAttempts = async function() {
//   await this.constructor.updateOne(
//     { _id: this._id },
//     { $set: { loginAttempts: 0 }, $unset: { lockUntil: '' } }
//   );
// };

// // Static methods
// userSchema.statics.findActiveSellers = function() {
//   return this.find({
//     role: 'seller',
//     accountStatus: 'active',
//     isVerified: true
//   });
// };

// userSchema.statics.getSellerStats = async function() {
//   return this.aggregate([
//     { $match: { role: 'seller' } },
//     {
//       $group: {
//         _id: null,
//         totalSellers: { $sum: 1 },
//         averageRating: { $avg: '$averageRating' },
//         totalTicketsSold: { $sum: '$sellerStats.ticketsSold' },
//         averageSuccessfulTransactions: { $avg: '$sellerStats.successfulTransactions' }
//       }
//     }
//   ]);
// };
// userSchema.set('toObject', { virtuals: true });
// userSchema.set('toJSON', { virtuals: true });

// module.exports = mongoose.model('User', userSchema);


const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

// Define bcrypt rounds (or load from environment variables)
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters long'],
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters long'],
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please enter a valid email address']
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^\+91\d{10}$/.test(v); // Ensures the stored number is always in +91XXXXXXXXXX format
        },
        message: "Phone number must be in the format: +91XXXXXXXXXX"
      }
    },
    phoneVerified: {
      type: Boolean,
      default: false,
      select: false
    },
    photoUrl: {
      type: String,
      default: "https://geographyandyou.com/images/user-profile.png",
      validate: {
        validator: (v) => validator.isURL(v),
        message: 'Invalid photo URL'
      }
    },
    otp: {
      code: {
        type: String,
        select: false
      },
      attempts: {
        type: Number,
        default: 0,
        select: false
      },
      expiresAt: {
        type: Date,
        select: false
      }
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false
    },
    role: {
      type: String,
      enum: {
        values: ["buyer", "seller"],
        message: '{VALUE} is not a valid Role type'
      },
      required: true,
      default: 'buyer',
      index: true
    },
    ratings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Rating'
      }
    ],
    averageRating: {
      type: Number,
      default: 5.0,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    // Buyer-specific stats
    buyerStats: {
      totalTicketsBought: {
        type: Number,
        default: 0,
        min: 0
      },
      successfulPurchases: {
        type: Number,
        default: 0
      },
      cancelledPurchases: {
        type: Number,
        default: 0
      }
    },
    // Seller-specific stats
    sellerStats: {
      ticketsSold: {
        type: Number,
        default: 0,
        min: 0
      },
      ticketsAllowed: {
        type: Number,
        default: 2,
        min: 0,
        max: 10
      },
      isNewSeller: {
        type: Boolean,
        default: true
      },
      successfulTransactions: {
        type: Number,
        default: 0
      },
      cancelledTransactions: {
        type: Number,
        default: 0
      }
    },
    accountStatus: {
      type: String,
      enum: {
        values: ['active', 'warned', 'blocked'],
        message: '{VALUE} is not a valid account status'
      },
      default: 'active',
      index: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    lastLogin: {
      type: Date,
      select: false
    },
    loginAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    lockUntil: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
userSchema.index({ role: 1, accountStatus: 1 }); // Compound index
userSchema.index({ 'sellerStats.ticketsSold': -1 });
userSchema.index({ 'buyerStats.totalTicketsBought': -1 });
userSchema.index({ createdAt: -1 });

// Virtual fields
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('accountAge').get(function() {
  // createdAt is provided by timestamps option
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Pre-save hook to hash password if modified and not already hashed
userSchema.pre('save', async function(next) {
  // Check if password is modified and is not already hashed (bcrypt hashes start with "$2")
  if (this.isModified('password') && !this.password.startsWith('$2')) {
    try {
      const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

userSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

userSchema.methods.incrementLoginAttempts = async function() {
  const updates = {};
  const attempts = this.loginAttempts + 1;

  // If previous lock has expired, reset the loginAttempts count
  if (this.lockUntil && this.lockUntil < Date.now()) {
    updates.$set = { loginAttempts: 1 };
    updates.$unset = { lockUntil: '' };
  } else {
    updates.$inc = { loginAttempts: 1 };
    if (attempts >= 5) {
      updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // Lock for 2 hours
    }
  }

  await this.constructor.updateOne({ _id: this._id }, updates);
};

userSchema.methods.resetLoginAttempts = async function() {
  await this.constructor.updateOne(
    { _id: this._id },
    { $set: { loginAttempts: 0 }, $unset: { lockUntil: '' } }
  );
};

// Static methods
userSchema.statics.findActiveSellers = function() {
  return this.find({
    role: 'seller',
    accountStatus: 'active',
    isVerified: true
  });
};

userSchema.statics.getSellerStats = async function() {
  return this.aggregate([
    { $match: { role: 'seller' } },
    {
      $group: {
        _id: null,
        totalSellers: { $sum: 1 },
        averageRating: { $avg: '$averageRating' },
        totalTicketsSold: { $sum: '$sellerStats.ticketsSold' },
        averageSuccessfulTransactions: { $avg: '$sellerStats.successfulTransactions' }
      }
    }
  ]);
};

userSchema.statics.getBuyerStats = async function() {
  return this.aggregate([
    { $match: { role: 'buyer' } },
    {
      $group: {
        _id: null,
        totalBuyers: { $sum: 1 },
        totalTicketsBought: { $sum: '$buyerStats.totalTicketsBought' },
        averageSuccessfulPurchases: { $avg: '$buyerStats.successfulPurchases' }
      }
    }
  ]);
};

userSchema.set('toObject', { virtuals: true });
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);