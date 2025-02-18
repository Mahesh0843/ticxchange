const cron = require('node-cron');
const Ticket = require('../models/Ticket');
const moment = require('moment');

// Run every 5 minutes
const cleanupExpiredTickets = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const currentDateTime = moment();
      
      const result = await Ticket.deleteMany({
        $and: [
          {
            $or: [
              // Check if event date is in the past
              { eventDate: { $lt: currentDateTime.toDate() } },
              // Check if event date is today but time has passed
              {
                $and: [
                  { eventDate: { 
                    $gte: currentDateTime.startOf('day').toDate(),
                    $lte: currentDateTime.endOf('day').toDate()
                  }},
                  { eventDate: { $lt: currentDateTime.toDate() }}
                ]
              }
            ]
          },
          { status: 'available' },
          { isAvailable: true }
        ]
      });

      if (result.deletedCount > 0) {
        console.log(
          `[${currentDateTime.format('YYYY-MM-DD HH:mm:ss')}] ` +
          `Ticket Cleanup: Deleted ${result.deletedCount} expired tickets`
        );
      }
    } catch (error) {
      console.error(
        `[${moment().format('YYYY-MM-DD HH:mm:ss')}] ` +
        `Ticket Cleanup Error:`, error.message
      );
    }
  });
};

module.exports = cleanupExpiredTickets; 