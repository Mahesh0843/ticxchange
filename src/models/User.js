const mongoose = require("mongoose");

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
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["buyer", "seller"],
      required: true,
    },
    ratings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Rating",
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
      default: 2,
    },
    accountStatus: {
      type: String,
      enum: ["active", "warned", "blocked"],
      default: "active",
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model("User", userSchema);
