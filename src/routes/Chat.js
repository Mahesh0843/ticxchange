const express = require("express");
const { userAuth } = require("../middleware/auth");
const mongoose = require('mongoose');
const Chat = require("../models/Chat");
const messageRateLimiter = require("../middleware/rateLimiter");
const { validateChatParams, validateMessageBody } = require("../middleware/chatValidation");
const ConnectionRequest = require("../models/ConnectionRequest");
const Ticket = require("../models/Ticket");
const User = require("../models/User");

const chatRouter = express.Router();

// Helper function for ObjectId conversion
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

// Get chat history endpoint
chatRouter.get("/chat/:targetUserId", 
    userAuth,
    validateChatParams,
    async (req, res) => {
    try {
        const { targetUserId } = req.params;
        const { ticketId } = req.query;
        const userId = req.user._id;

        console.log('Debug Info:', {
            userId,
            targetUserId,
            ticketId
        });

        const userObjectId = toObjectId(userId);
        const targetObjectId = toObjectId(targetUserId);
        const ticketObjectId = toObjectId(ticketId);

        // Validate connection
        const connection = await ConnectionRequest.findOne({
            $or: [
                { fromUserId: userObjectId, toUserId: targetObjectId, ticketId: ticketObjectId },
                { fromUserId: targetObjectId, toUserId: userObjectId, ticketId: ticketObjectId }
            ],
            status: { $in: ['accepted', 'archived'] }
        });

        console.log('Connection found:', connection);

        if (!connection) {
            return res.status(403).json({ error: "No active connection for this ticket" });
        }

        // Find chat and populate messages
        let chat = await Chat.findOne({
            participants: { $all: [userObjectId, targetObjectId] },
            ticketId: ticketObjectId
        }).populate({
            path: 'messages.senderId',
            select: 'firstName lastName'
        });

        console.log('Chat found:', chat);

        if (!chat) {
            chat = await Chat.create({
                participants: [userObjectId, targetObjectId],
                ticketId: ticketObjectId,
                messages: []
            });
            console.log('New chat created:', chat);
        }

        res.status(200).json({
            success: true,
            data: {
                chatId: chat._id,
                participants: chat.participants,
                messages: chat.messages,
                ticketId: chat.ticketId
            }
        });

    } catch (err) {
        console.error("Get chat error:", err);
        res.status(500).json({ error: err.message || "Failed to get chat history" });
    }
});

// Send message endpoint
chatRouter.post("/chat/:targetUserId/message", 
    userAuth, 
    validateChatParams,
    validateMessageBody,
    messageRateLimiter, 
    async (req, res) => {
    try {
        const { targetUserId } = req.params;
        const { ticketId, text } = req.body;
        const userId = req.user._id;

        console.log('Message Debug Info:', {
            userId,
            targetUserId,
            ticketId,
            text
        });

        const userObjectId = toObjectId(userId);
        const targetObjectId = toObjectId(targetUserId);
        const ticketObjectId = toObjectId(ticketId);

        // Validate connection exists
        const connection = await ConnectionRequest.findOne({
            $or: [
                { fromUserId: userObjectId, toUserId: targetObjectId, ticketId: ticketObjectId },
                { fromUserId: targetObjectId, toUserId: userObjectId, ticketId: ticketObjectId }
            ],
            status: 'accepted'
        });

        console.log('Connection for message:', connection);

        if (!connection) {
            return res.status(403).json({ error: "No active connection for this ticket" });
        }

        // Use findOrCreateChat static method
        let chat = await Chat.findOrCreateChat(userObjectId, targetObjectId, ticketObjectId);
        
        console.log('Chat for message:', chat);

        // Add new message
        const newMessage = {
            senderId: userObjectId,
            text: text.trim(),
            timestamp: new Date()
        };
        
        chat.messages.push(newMessage);
        await chat.save();

        // Populate sender info
        const populatedMessage = await Chat.populate(newMessage, {
            path: 'senderId',
            select: 'firstName lastName'
        });

        res.status(201).json({ message: populatedMessage });

    } catch (err) {
        console.error("Send message error:", err);
        res.status(500).json({ error: err.message || "Failed to send message" });
    }
});

// Get all chats for a user
chatRouter.get("/chats", 
    userAuth,
    async (req, res) => {
    try {
        const userId = toObjectId(req.user._id);

        const chats = await Chat.find({
            participants: userId
        })
        .populate({
            path: 'participants',
            select: 'firstName lastName'
        })
        .populate({
            path: 'ticketId',
            select: 'eventName eventDate'
        })
        .sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            data: chats.map(chat => ({
                chatId: chat._id,
                participants: chat.participants,
                lastMessage: chat.messages[chat.messages.length - 1],
                ticketDetails: chat.ticketId,
                updatedAt: chat.updatedAt
            }))
        });

    } catch (err) {
        console.error("Get all chats error:", err);
        res.status(500).json({ error: err.message || "Failed to get chats" });
    }
});

// Mark ticket as sold
chatRouter.post("/tickets/:ticketId/mark-sold", userAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { buyerId } = req.body;
    const sellerId = req.user._id;

    const ticket = await Ticket.findOne({ _id: ticketId, sellerId });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (ticket.status !== "available") {
      return res.status(400).json({ error: "Ticket is not available" });
    }

    ticket.status = "pending";
    ticket.buyerId = buyerId;
    await ticket.save();

    // Send notification to buyer (you can implement this based on your notification system)
    // sendNotificationToBuyer(buyerId, sellerId, ticketId);

    res.json({ success: true, message: "Ticket marked as pending sale" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Confirm purchase
chatRouter.post("/tickets/:ticketId/confirm", userAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const buyerId = req.user._id;

    const ticket = await Ticket.findOne({ _id: ticketId, buyerId });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (ticket.status !== "pending") {
      return res.status(400).json({ error: "Ticket is not pending confirmation" });
    }

    ticket.status = "sold";
    ticket.confirmedAt = new Date();
    await ticket.save();

    // Schedule review reminder (implement based on your task scheduler)
    // scheduleReviewReminder(buyerId, ticket.sellerId, ticketId);

    res.json({ success: true, message: "Purchase confirmed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report dispute
chatRouter.post("/tickets/:ticketId/dispute", userAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { reason } = req.body;
    const buyerId = req.user._id;

    const ticket = await Ticket.findOne({ _id: ticketId, buyerId });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    ticket.status = "disputed";
    ticket.disputeReason = reason;
    ticket.disputedAt = new Date();
    await ticket.save();

    // Notify admins (implement based on your notification system)
    // notifyAdmins(ticketId, reason);

    res.json({ success: true, message: "Dispute reported" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit review
chatRouter.post("/tickets/:ticketId/review", userAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { rating, comment } = req.body;
    const buyerId = req.user._id;

    const ticket = await Ticket.findOne({ _id: ticketId, buyerId, status: "sold" });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found or not eligible for review" });
    }

    if (ticket.reviewed) {
      return res.status(400).json({ error: "Review already submitted" });
    }

    // Add review to ticket
    ticket.review = {
      rating,
      comment,
      createdAt: new Date(),
      buyerId
    };
    ticket.reviewed = true;
    await ticket.save();

    // Update seller's average rating (implement based on your user schema)
    // await updateSellerRating(ticket.sellerId);

    res.json({ success: true, message: "Review submitted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = chatRouter;