const socket = require("socket.io");
const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const ConnectionRequest = require('../models/ConnectionRequest');

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
  });

  io.on("connection", (socket) => {
    // Join chat room
    socket.on("joinChat", async ({ userId, targetUserId, ticketId }) => {
      try {
        if (!userId || !targetUserId || !ticketId) {
          socket.emit("error", { message: "Missing required parameters" });
          return;
        }

        const roomId = `chat-${ticketId}-${[userId, targetUserId].sort().join('-')}`;
        socket.join(roomId);
        
        // Store userId in socket for later use
        socket.userId = userId;
        socket.currentRoom = roomId;
        
        socket.emit("joinedChat", { roomId });

      } catch (error) {
        console.error("Join chat error:", error);
        socket.emit("error", { message: "Failed to join chat" });
      }
    });

    // Handle sending messages
    socket.on("sendMessage", async (messageData) => {
      try {
        const { userId, targetUserId, ticketId, text, firstName, lastName } = messageData;

        if (!text?.trim()) {
          socket.emit("error", { message: "Message cannot be empty" });
          return;
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);
        const targetObjectId = new mongoose.Types.ObjectId(targetUserId);
        const ticketObjectId = new mongoose.Types.ObjectId(ticketId);

        // Create the message object
        const messageObject = {
          senderId: userId,
          firstName,
          lastName,
          text: text.trim(),
          timestamp: new Date(),
        };

        // Save to database
        const chat = await Chat.findOne({
          participants: { $all: [userObjectId, targetObjectId] },
          ticketId: ticketObjectId
        });

        if (!chat) {
          socket.emit("error", { message: "Chat not found" });
          return;
        }

        const newMessage = {
          senderId: userObjectId,
          text: text.trim(),
          timestamp: messageObject.timestamp
        };

        chat.messages.push(newMessage);
        await chat.save();

        // Get room ID
        const roomId = `chat-${ticketId}-${[userId, targetUserId].sort().join('-')}`;

        // Broadcast to room (excluding sender)
        socket.to(roomId).emit("newMessage", {
          ...messageObject,
          isSender: false
        });

        // Acknowledge message sent to sender
        socket.emit("messageAcknowledged", {
          ...messageObject,
          isSender: true,
          messageId: newMessage._id
        });

      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("disconnect", () => {
      if (socket.currentRoom) {
        socket.leave(socket.currentRoom);
      }
      console.log("User disconnected");
    });
  });

  return io;
};

module.exports = initializeSocket;