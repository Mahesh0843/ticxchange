const cron = require('node-cron');
const ConnectionRequest = require('../models/ConnectionRequest');
const Ticket = require('../models/Ticket');

// Schedule to run every hour
const scheduleConnectionCleanup = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      // Find all connection requests
      const connections = await ConnectionRequest.find().populate('ticketId');
      
      for (const connection of connections) {
        // Skip if ticketId is null or ticket doesn't exist
        if (!connection.ticketId) continue;
        
        const ticket = await Ticket.findById(connection.ticketId);
        
        // Remove connection if ticket doesn't exist or is unavailable
        if (!ticket || !ticket.isAvailable) {
          await ConnectionRequest.findByIdAndDelete(connection._id);
          console.log(`Removed connection request ${connection._id} for unavailable ticket ${connection.ticketId}`);
        }
      }
      
      console.log('Connection cleanup completed successfully');
    } catch (error) {
      console.error('Error in connection cleanup:', error);
    }
  });
};

module.exports = scheduleConnectionCleanup; 