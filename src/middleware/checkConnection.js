const mongoose = require("mongoose");
const ConnectionRequest = require("../models/ConnectionRequest"); // Ensure this is correctly imported

const checkConnection = async (req, res, next) => {
  try {
    // Your connection validation logic
    const connection = await ConnectionRequest.findOne({
      $or: [
        { fromUserId: req.user._id, toUserId: req.params.targetUserId },
        { fromUserId: req.params.targetUserId, toUserId: req.user._id }
      ],
      ticketId: req.query.ticketId,
      status: "accepted"
    });

    if (!connection) return res.status(403).json({ error: "No active connection" });
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {checkConnection};