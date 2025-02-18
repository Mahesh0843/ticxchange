const express = require('express');
const router = express.Router();
const { userAuth } = require('../middleware/auth');
const { 
  filterTickets,
  viewSellerTickets, 
  viewBuyerTickets,
  deleteTicket,
  getTickets,
  getTicketDetails
} = require('../controllers/viewticketController');

const verifyRole = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.status(403).json({ 
      success: false,
      error: `Access restricted to ${role}s only` 
    });
  }
  next();
};

// Public routes
router.get('/tickets/filter', filterTickets);
router.get('/tickets', getTickets);
router.get('/tickets/:ticketId', getTicketDetails);


// Seller routes
router.get('/seller/tickets', userAuth, verifyRole('seller'), viewSellerTickets);
router.delete('/seller/tickets/:ticketId', userAuth, verifyRole('seller'), deleteTicket);

// Buyer routes
router.get('/buyer/tickets', userAuth, verifyRole('buyer'), viewBuyerTickets);

module.exports = router;