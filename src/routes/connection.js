// const express = require("express");
// const requestRouter = express.Router();
// const { userAuth } = require("../middleware/auth");

// const { 
//   connectionReq, 
//   requestReview, 
//   getConnectionRequests 
// } = require("../controllers/requestController");

// // Middleware to verify user roles
// const verifyRoleMiddleware = (role) => {
//   return (req, res, next) => {
//     if (req.user.role !== role) {
//       return res.status(403).json({ 
//         error: `Access restricted to ${role}s only` 
//       });
//     }
//     next();
//   };
// };

// // Buyer routes
// requestRouter.post(
//   "/connection/connect/:ticketId/:toUserId",
//   userAuth,
//   verifyRoleMiddleware('buyer'),
//   connectionReq
// );

// // Get buyer's connection requests
// requestRouter.get(
//   "/connection/buyer/requests",
//   userAuth,
//   verifyRoleMiddleware('buyer'),
//   getConnectionRequests
// );

// // Seller routes
// requestRouter.put(
//   "/connection/review/:requestId/:status",
//   userAuth,
//   verifyRoleMiddleware('seller'),
//   requestReview
// );

// // Get seller's connection requests
// requestRouter.get(
//   "/connection/seller/requests",
//   userAuth,
//   verifyRoleMiddleware('seller'),
//   getConnectionRequests
// );

// module.exports = requestRouter;


const express = require("express");
const requestRouter = express.Router();
const { userAuth } = require("../middleware/auth");
const { connectionReq, requestReview, getConnectionRequests } = require("../Controllers/requestController");
const {getconnections}= require("../Controllers/userController");

// Middleware to verify user roles
const verifyRoleMiddleware = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Access restricted to ${role}s only` });
    }
    next();
  };
};

// Buyer routes
requestRouter.post(
  "/connection/connect/:ticketId/:toUserId",
  userAuth,
  verifyRoleMiddleware("buyer"),
  connectionReq
);

// Get buyer's connection requests
// requestRouter.get(
//   "/connection/buyer/requests",
//   userAuth,
//   verifyRoleMiddleware("buyer"),
//   getConnectionRequests
// );

// Seller routes
requestRouter.post(
  "/connection/review/:requestId/:status",
  userAuth,
  verifyRoleMiddleware("seller"),
  requestReview
);

// Get seller's connection requests
requestRouter.get(
  "/connection/seller/requests",
  userAuth,
  verifyRoleMiddleware("seller"),
  getconnections
);

module.exports = requestRouter;
