const Ticket = require('../models/Ticket');
const User = require('../models/User');
const verifyTicketCreateSuccessful = async (req, res, next) => {
  try {
    // Fetch a ticket created by the current user
    const ticket = await Ticket.findOne({ sellerId: req.user._id });

    if (!ticket) {
      return res
        .status(404)
        .json({ message: 'Ticket not found. Please create a Ticket.' });
    }

    // Attach the ticket to the request object
    req.ticket = ticket;

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error in ticket verification' });
  }
};

module.exports = {verifyTicketCreateSuccessful};
