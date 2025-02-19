const Ticket = require('../models/Ticket');
const moment = require('moment');

// Filter Tickets

exports.filterTickets = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      search = '',
      city,
      sortBy = 'eventDate',
      sortOrder = 'asc',
      eventType
    } = req.query;

    // Input validation
    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;
    const validatedSortOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'asc';

    // Always include isAvailable: true in base query
    const query = { isAvailable: true };

    // Event type filter
    if (eventType && ['MOVIE', 'SPORT', 'EVENT'].includes(eventType.toUpperCase())) {
      query.eventType = eventType.toUpperCase();
    }

    // Search filter
    if (search) {
      query.$and = [
        { isAvailable: true },  // Ensure isAvailable is true even with search
        {
          $or: [
            { eventName: { $regex: search, $options: 'i' } },
            { venue: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

    // City filter
    if (city) {
      query['location.city'] = { 
        $regex: new RegExp(city, 'i') 
      };
    }

    // Validate sortBy field exists in schema
    const validSortFields = ['eventDate', 'price', 'uploadedAt', 'eventType'];
    const validatedSortBy = validSortFields.includes(sortBy) ? sortBy : 'eventDate';

    const sort = { [validatedSortBy]: validatedSortOrder === 'asc' ? 1 : -1 };

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .populate('sellerId', 'firstName lastName photoUrl sellerStats accountStatus averageRating')
        .sort(sort)
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .lean(),
      Ticket.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNumber);

    res.status(200).json({
      success: true,
      message: 'Tickets retrieved successfully',
      data: {
        tickets,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalItems: total,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
          limit: limitNumber
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error while filtering tickets',
      error: error.message 
    });
  }
};
// View Seller Tickets
exports.viewSellerTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const sellerId = req.user._id;

    const tickets = await Ticket.find({ sellerId })
      .populate('buyerId', 'firstName lastName email')
      .sort({ uploadedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Ticket.countDocuments({ sellerId });
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      message: 'Seller tickets retrieved successfully',
      data: {
        tickets,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalItems: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving seller tickets' });
  }
};

// View Buyer Tickets
exports.viewBuyerTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const buyerId = req.user._id;

    const tickets = await Ticket.find({ buyerId })
      .populate('sellerId', 'firstName lastName email')
      .sort({ eventDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Ticket.countDocuments({ buyerId });
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      message: 'Buyer tickets retrieved successfully',
      data: {
        tickets,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalItems: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving buyer tickets' });
  }
};

// Delete Ticket
exports.deleteTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const sellerId = req.user._id;

    const ticket = await Ticket.findOneAndDelete({ 
      _id: ticketId, 
      sellerId,
      isAvailable: true 
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found or not available for deletion' });
    }

    res.status(200).json({ 
      message: 'Ticket deleted successfully',
      ticketId
    });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting the ticket' });
  }
}; 


// ... existing code ...

// Get all tickets
exports.getTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const tickets = await Ticket.find()
      .populate('sellerId', 'firstName lastName rating')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Ticket.countDocuments();
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      message: "Tickets fetched successfully",
      data: {
        tickets,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalItems: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      error: "Failed to fetch tickets"
    });
  }
};

// Get single ticket details
exports.getTicketDetails = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findById(ticketId)
    .populate('sellerId', 'firstName lastName photoUrl sellerStats accountStatus averageRating')
    .lean();

    if (!ticket) {
      return res.status(404).json({
        error: "Ticket not found"
      });
    }

    res.status(200).json({
      message: "Ticket details fetched successfully",
      data: ticket
    });
  } catch (error) {
    console.error('Get ticket details error:', error);
    res.status(500).json({
      error: "Failed to fetch ticket details"
    });
  }
};

// Add a dedicated search endpoint
exports.searchTickets = async (req, res) => {
  try {
    const { q = '' } = req.query;

    const tickets = await Ticket.find({
      isAvailable: true,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { eventName: { $regex: q, $options: 'i' } }
      ]
    })
    .populate('sellerId', 'firstName lastName rating')
    .sort({ eventDate: 'asc' })
    .limit(10)
    .lean();

    res.status(200).json({
      success: true,
      message: 'Search results retrieved successfully',
      data: tickets
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error while searching tickets',
      error: error.message 
    });
  }
};

// ... existing code ...