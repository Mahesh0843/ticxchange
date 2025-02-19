const express = require("express");
const profileRouter = express.Router();

const { profileview, updatePassword, updateUserProfile,sendOTP,verifyOTP } = require("../Controllers/profilecontroller");
const { userAuth } = require("../middleware/auth");

profileRouter.get("/profile/view", userAuth, profileview);
profileRouter.patch("/profile/edit", userAuth, updateUserProfile);
profileRouter.patch("/profile/update-password",userAuth, updatePassword);
profileRouter.post("/profile/send-otp",userAuth,sendOTP);
profileRouter.post("/profile/verify-otp",userAuth,verifyOTP)
module.exports = profileRouter; 