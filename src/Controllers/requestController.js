const Ticket = require('../models/Ticket');
const User = require("../models/User");
const ConnectionRequest = require("../models/ConnectionRequest");
console.log("Ticket model:", Ticket);

const mongoose = require('mongoose');

// exports.connectionReq = async (req, res) => {
//   try {
//     const fromUserId = req.user._id;
//     const toUserId = req.params.toUserId;
//     const ticketId = req.params.ticketId;
//     const status = "interested";

//     const ticket = await Ticket.findById(ticketId);
//     if (!ticket) {
//       return res.status(404).json({ message: "Ticket not found!" });
//     }
//     if (!ticket.isAvailable) {
//       return res.status(400).json({ message: "Ticket is no longer available!" });
//     }

//     if (ticket.sellerId.toString() !== toUserId) {
//       return res.status(400).json({ message: "Invalid seller for this ticket!" });
//     }

//     const toUser = await User.findById(toUserId);
//     if (!toUser) {
//       return res.status(404).json({ message: "Seller not found!" });
//     }

//     const existingConnectionRequest = await ConnectionRequest.findOne({
//       ticketId,
//       fromUserId,
//       toUserId,
//     });
//     if (existingConnectionRequest) {
//       return res.status(400).json({ message: "You have already shown interest in this ticket!" });
//     }

//     const connectionRequest = new ConnectionRequest({
//       fromUserId,
//       toUserId,
//       ticketId,
//       status,
//     });

//     const data = await connectionRequest.save();
    
//     // Optionally, send notification to seller
//     // await notificationService.sendNotification({
//     //   userId: toUserId,
//     //   type: 'connection_request',
//     //   message: `New connection request for ticket ${ticket.eventName}`,
//     //   data: { connectionRequestId: connectionRequest._id }
//     // });

//     res.json({
//       message: `${req.user.firstName} has shown interest in buying the ticket from ${toUser.firstName}`,
//       data,
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Error processing request", error: err.message });
//   }
// }; 


// exports.connectionReq = async (req, res) => {
//   try {
//     const fromUserId = req.user._id;
//     const toUserId = req.params.toUserId;
//     const ticketId = req.params.ticketId;
//     const status = "interested";

//     // Check if ticket exists and is available
//     const ticket = await Ticket.findById(ticketId);
//     if (!ticket) {
//       return res.status(404).json({ message: "Ticket not found!" });
//     }
//     if (!ticket.isAvailable) {
//       return res.status(400).json({ message: "Ticket is no longer available!" });
//     }

//     // Validate that the seller is correct
//     if (ticket.sellerId.toString() !== toUserId) {
//       return res.status(400).json({ message: "Invalid seller for this ticket!" });
//     }

//     // Check if the seller exists
//     const toUser = await User.findById(toUserId);
//     if (!toUser) {
//       return res.status(404).json({ message: "Seller not found!" });
//     }

//     // Look for an existing connection request for this ticket between the buyer and seller
//     let existingConnectionRequest = await ConnectionRequest.findOne({
//       ticketId,
//       fromUserId,
//       toUserId,
//     });

//     if (existingConnectionRequest) {
//       // If the request is archived, reactivate it by updating its status
//       if (existingConnectionRequest.status === "archived") {
//         existingConnectionRequest.status = "interested";
//         // Optionally, clear the archivedAt field if needed:
//         existingConnectionRequest.archivedAt = undefined;
//         const updatedRequest = await existingConnectionRequest.save();
//         return res.status(200).json({
//           message: "Your archived connection request has been reactivated.",
//           data: updatedRequest,
//         });
//       } else {
//         // For any other status, prevent duplicate connection requests
//         return res
//           .status(400)
//           .json({ message: "You have already shown interest in this ticket!" });
//       }
//     }

//     // If no existing connection request, create a new one
//     const connectionRequest = new ConnectionRequest({
//       fromUserId,
//       toUserId,
//       ticketId,
//       status,
//     });

//     const data = await connectionRequest.save();

//     // Optionally, send a notification to the seller here
//     // await notificationService.sendNotification({ ... });

//     res.json({
//       message: `${req.user.firstName} has shown interest in buying the ticket from ${toUser.firstName}`,
//       data,
//     });
//   } catch (err) {
//     res
//       .status(500)
//       .json({ message: "Error processing request", error: err.message });
//   }
// };




// Debug: Check if Ticket is imported correctly


exports.connectionReq = async (req, res) => {
  try {
    const { _id: fromUserId } = req.user; // Buyer's ID
    const { toUserId, ticketId } = req.params;

    // Validate MongoDB ObjectIDs
    if (!mongoose.Types.ObjectId.isValid(ticketId) || !mongoose.Types.ObjectId.isValid(toUserId)) {
      return res.status(400).json({ message: "Invalid ticket or user ID format" });
    }

    // Debug: Log the ticketId and toUserId
    console.log("Ticket ID:", ticketId);
    console.log("Seller ID:", toUserId);

    // Check if buyer is trying to connect to themselves
    if (fromUserId.toString() === toUserId) {
      return res.status(400).json({ message: "Cannot send request to yourself" });
    }

    // Find the ticket using proper MongoDB ObjectId
    const ticket = await Ticket.findOne({
      _id: new mongoose.Types.ObjectId(ticketId),
      isAvailable: true,
      sellerId: new mongoose.Types.ObjectId(toUserId)
    });

    // Debug: Log the ticket
    console.log("Ticket found:", ticket);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found or unavailable" });
    }

    // Check for existing request using proper ObjectIds
    const existingRequest = await ConnectionRequest.findOne({
      fromUserId: new mongoose.Types.ObjectId(fromUserId),
      toUserId: new mongoose.Types.ObjectId(toUserId),
      ticketId: new mongoose.Types.ObjectId(ticketId)
    });

    if (existingRequest) {
      if (existingRequest.status === "archived") {
        existingRequest.status = "interested";
        existingRequest.archivedAt = undefined;
        await existingRequest.save();
        return res.status(200).json({ 
          message: "Reactivated archived request", 
          data: existingRequest 
        });
      }
      return res.status(400).json({ message: "You have already shown interest" });
    }

    // Create new request with proper ObjectIds
    const newRequest = await ConnectionRequest.create({
      fromUserId: new mongoose.Types.ObjectId(fromUserId),
      toUserId: new mongoose.Types.ObjectId(toUserId),
      ticketId: new mongoose.Types.ObjectId(ticketId),
      status: "interested"
    });

    res.status(201).json({ 
      message: "Interest successfully shown", 
      data: newRequest 
    });

  } catch (err) {
    console.error("Connection request error:", err);
    res.status(500).json({ 
      message: "Error processing request", 
      error: err.message 
    });
  }
};
// exports.connectionReq = async (req, res) => {
//   try {
//        const fromUserId = req.user._id;
//     const toUserId = req.params.toUserId;
//     const ticketId = req.params.ticketId;
//     const status = "interested";

//     // Combined ticket validation query
//     const ticket = await Ticket.findOne({
//       _id: ticketId,
//       isAvailable: true,
//       sellerId: toUserId
//     }).lean();

//     if (!ticket) {
//       return res.status(400).json({ message: "Invalid ticket or seller" });
//     }

//     // Check for existing request using the compound index
//     let existingRequest = await ConnectionRequest.findOne({
//       fromUserId,
//       toUserId,
//       ticketId
//     });

//     if (existingRequest) {
//       if (existingRequest.status === "archived") {
//         existingRequest.status = "interested";
//         existingRequest.archivedAt = undefined;
//         await existingRequest.save();
//         return res.json({ message: "Reactivated archived request" });
//       }
//       return res.status(400).json({ message: "Request already exists" });
//     }

//     // Create new request
//     const newRequest = await ConnectionRequest.create({
//       fromUserId,
//       toUserId,
//       ticketId,
//       status: "interested"
//     });

//     res.json({
//       message: "Interest successfully shown",
//       data: newRequest
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Error processing request", error: err.message });
//   }
// };


  
exports.requestReview= async (req, res) => {
  try {
    const loggedInUser = req.user;
    const { status, requestId } = req.params;

    const allowedStatus = ["accepted", "rejected"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Status not allowed!" });
    }

    const connectionRequest = await ConnectionRequest.findOne({
      _id: requestId,
      toUserId: loggedInUser._id,
      status: "interested",
    });
    if (!connectionRequest) {
      return res
        .status(404)
        .json({ message: "Connection request not found" });
    }

    connectionRequest.status = status;

    const data = await connectionRequest.save();

    res.json({
      message: `Connection request ${status}`,
      data: {
        requestId: connectionRequest._id,
        status: connectionRequest.status,
        ticketId: connectionRequest.ticketId,
        buyerId: connectionRequest.fromUserId,
        sellerId: connectionRequest.toUserId
      }
    });
  } catch (err) {
    res.status(400).send("ERROR: " + err.message);
  }
};




exports.updateTicketAfterPayment = async (ticketId, buyerId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Update the ticket to mark it as sold
    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        isAvailable: false,
        buyerId: buyerId,
        soldAt: new Date()
      },
      { new: true, session }
    );

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Update all connection requests for this ticket with status "accepted" to "archived"
    await ConnectionRequest.updateMany(
      { ticketId, status: 'accepted' }, 
      { status: 'archived', archivedAt: new Date() },
      { session }
    );

    // Delete all connection requests for this ticket with status "inserted"
    await ConnectionRequest.deleteMany(
      { ticketId, status: 'inserted' },
      { session }
    );

    // Optionally update seller stats
    await User.findByIdAndUpdate(
      ticket.sellerId,
      {
        $inc: {
          'sellerStats.ticketsSold': 1,
          'sellerStats.successfulTransactions': 1
        }
      },
      { session }
    );

    await session.commitTransaction();
    return ticket;
  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating ticket after payment:', error);
    throw error;
  } finally {
    session.endSession();
  }
};
// In your connection request controller (where you handle payment success)
exports.handlePaymentSuccess = async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    // 1. Archive all accepted connection requests
    await ConnectionRequest.updateMany(
      { ticketId, status: 'accepted' },
      { 
        status: 'archived',
        archivedAt: new Date()
      }
    );

    // 2. Delete all connection requests with status 'interested'
    await ConnectionRequest.deleteMany({ 
      ticketId, 
      status: 'interested' 
    });

    // Additional payment success logic...
    res.json({ message: "Payment processed successfully" });
  } catch (err) {
    res.status(500).json({ 
      message: "Error processing payment", 
      error: err.message 
    });
  }
};