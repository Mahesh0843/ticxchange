const express = require("express");
const userRouter = express.Router();
const { userAuth } = require("../middleware/auth");
const {
    getRequests,
    getconnections,
} = require("../controllers/userController");

// Get received connection requests
userRouter.get("/user/requests/received", userAuth, getRequests);

// Get user connections
userRouter.get("/user/getConnections", userAuth, getconnections);

// Get user feed
// userRouter.get("/user/feed", userAuth, getfeed);

module.exports = userRouter;