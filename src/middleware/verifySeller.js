const User = require('../models/User'); // Import User model

const verifySeller = async (req, res, next) => {
  try {
    // Ensure the authenticated user exists in the request object
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized. Please log in to continue.' });
    }

    // Fetch seller details from the database
    const seller = await User.findById(req.user._id);

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found. Please register as a seller.' });
    }

    // Verify seller role
    if (seller.role !== 'seller') {
      return res.status(403).json({
        message: 'Access denied. Only sellers are authorized to perform this action.',
      });
    }

    // Check account restrictions and permissions
    if (seller.accountStatus === 'blocked') {
      return res.status(403).json({
        message: 'Your account has been blocked. Contact support for assistance.',
      });
    }

    if (seller.accountStatus === 'warned') {
      return res.status(403).json({
        message: 'Your account is under warning. Please resolve issues to continue selling.',
      });
    }

    // Ticket upload limitations for new sellers
    if (seller.isNewSeller && seller.ticketsSold >= 2) {
      return res.status(403).json({
        message: 'New sellers are limited to 2 ticket uploads. Upgrade your account for more sales.',
      });
    }
    req.

    // If all checks pass, proceed to the next middleware or controller
    next();
  } catch (error) {
    console.error('Error in verifySeller middleware:', error);
    res.status(500).json({
      message: 'An internal server error occurred during seller verification.',
    });
  }
};

module.exports = { verifySeller };
