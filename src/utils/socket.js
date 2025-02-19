const socket = require("socket.io");
const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const ConnectionRequest = require('../models/ConnectionRequest');
const Notification = require('../models/Notification');

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
  });

  // Function to create and emit notification
  const createNotification = async ({ recipient, message, type, relatedId, onModel }) => {
    try {
      const notification = await Notification.create({
        recipient,
        message,
        type,
        relatedId,
        onModel
      });

      io.to(`notifications:${recipient}`).emit('notification', notification);
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

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

    // Join notification room
    socket.on('joinNotifications', (userId) => {
      if (userId) {
        socket.join(`notifications:${userId}`);
        socket.userId = userId;
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

        // Create notification using the new function
        await createNotification({
          recipient: targetUserId,
          message: `New message from ${firstName} ${lastName}`,
          type: 'message',
          relatedId: ticketId,
          onModel: 'Chat'
        });

      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Store user's socket id with their userId
    socket.on('user_connected', (userId) => {
      socket.userId = userId;
    });

    // Mark notification as read
    socket.on('mark_notification_read', async (notificationId) => {
      try {
        const notification = await Notification.findByIdAndUpdate(
          notificationId, 
          { read: true },
          { new: true }
        );
        
        if (notification) {
          // Emit to the user that notification was updated
          socket.emit('notification_updated', notification);
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
        socket.emit("error", { message: "Failed to mark notification as read" });
      }
    });

    // Mark all notifications as read and delete them
    socket.on('mark_all_notifications_read', async () => {
      try {
        if (!socket.userId) return;

        // First mark all as read
        await Notification.updateMany(
          { recipient: socket.userId, read: false },
          { read: true }
        );

        // Then delete all read notifications
        const result = await Notification.deleteMany({
          recipient: socket.userId,
          read: true
        });

        socket.emit('all_notifications_read_and_deleted', {
          message: 'All notifications marked as read and deleted',
          deletedCount: result.deletedCount
        });
      } catch (error) {
        console.error('Error processing notifications:', error);
        socket.emit("error", { message: "Failed to process notifications" });
      }
    });

    socket.on("disconnect", () => {
      if (socket.currentRoom) {
        socket.leave(socket.currentRoom);
      }
      if (socket.userId) {
        socket.leave(`notifications:${socket.userId}`);
      }
      console.log("User disconnected");
    });
  });

  return io;
};

module.exports = initializeSocket;