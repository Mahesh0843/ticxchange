const mongoose = require('mongoose');

const validateChatParams = (req, res, next) => {
    const { targetUserId } = req.params;
    const ticketId = req.query.ticketId || req.body.ticketId;
    
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        return res.status(400).json({ error: "Invalid target user ID" });
    }
    
    if (!ticketId || !mongoose.Types.ObjectId.isValid(ticketId)) {
        return res.status(400).json({ error: "Invalid ticket ID" });
    }
    
    if (req.user._id.toString() === targetUserId) {
        return res.status(400).json({ error: "Cannot chat with yourself" });
    }
    
    next();
};

const validateMessageBody = (req, res, next) => {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Message text is required" });
    }
    
    if (text.trim().length === 0) {
        return res.status(400).json({ error: "Message cannot be empty" });
    }
    
    if (text.length > 1000) {
        return res.status(400).json({ error: "Message is too long" });
    }
    
    req.body.text = text.trim();
    next();
};

module.exports = {
    validateChatParams,
    validateMessageBody
}; 