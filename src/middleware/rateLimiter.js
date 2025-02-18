const rateLimit = require('express-rate-limit');

// Create message rate limiter
const messageRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 30, // Limit each IP to 30 messages per window
    message: {
        error: 'Too many messages sent. Please wait a minute before sending more messages.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: (req) => {
        // Use user ID for rate limiting if available, otherwise use IP
        return req.user?._id || req.ip;
    }
});

module.exports = messageRateLimiter; 