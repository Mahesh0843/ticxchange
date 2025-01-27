const Ticket = require('../models/Ticket');

// 1. Filter Tickets
exports.filterTickets = async (req, res) => {
  const { city, eventName, dateRange } = req.query;

  try {
    const query = {};
    if (city) query.city = city;
    if (eventName) query.eventName = { $regex: eventName, $options: 'i' };

    if (dateRange) {
      const currentDate = new Date();
      let startDate, endDate;

      if (dateRange === 'Today') {
        startDate = new Date(currentDate.setHours(0, 0, 0, 0));
        endDate = new Date(currentDate.setHours(23, 59, 59, 999));
      } else if (dateRange === 'Tomorrow') {
        startDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(currentDate.setHours(23, 59, 59, 999));
      } else if (dateRange === 'Weekend') {
        const day = currentDate.getDay();
        const daysUntilSaturday = (6 - day + 1) % 7;
        const daysUntilSunday = (7 - day + 1) % 7;

        startDate = new Date(currentDate.setDate(currentDate.getDate() + daysUntilSaturday));
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(currentDate.setDate(currentDate.getDate() + daysUntilSunday));
        endDate.setHours(23, 59, 59, 999);
      }

      if (startDate && endDate) query.eventDate = { $gte: startDate, $lte: endDate };
    }

    const tickets = await Ticket.find(query);
    res.status(200).json({ message: 'Filtered tickets retrieved successfully', tickets });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error while filtering tickets' });
  }
};

// 2. View All Tickets (Seller)
exports.viewSellerTickets = async (req, res) => {
  const { id } = req.params;

  try {
    const tickets = await Ticket.find({ sellerId: id });
    res.status(200).json({ message: 'Seller tickets retrieved successfully', tickets });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error retrieving seller tickets' });
  }
};

// 3. View All Tickets (Buyer)
exports.viewBuyerTickets = async (req, res) => {
  const { id } = req.params;
  

  try {
    const tickets = await Ticket.find({ buyerId: id });
    res.status(200).json({ message: 'Buyer tickets retrieved successfully', tickets });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error retrieving buyer tickets' });
  }
};

// 4. Edit/Delete Ticket (Seller)
exports.editDeleteTicket = async (req, res) => {
  const { id, ticketid } = req.params;
  if (id !== req.user_id) {
    return res.status(403).json({ error: 'Unauthorized: You can only delete your own tickets.' });
  }

  try {
    const ticket = await Ticket.findOne({ _id: ticketid, sellerId: id });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found or not authorized to edit' });
    }

    // Delete ticket
    await Ticket.findByIdAndDelete(ticketid);
    res.status(200).json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting the ticket' });
  }
};
