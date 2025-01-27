const express = require("express");
const profileRouter = express.Router();

const { profileview, updatePassword, updateUserProfile } = require("../controllers/profilecontroller");
const { userAuth } = require("../middleware/auth");

profileRouter.get("/view", userAuth, profileview);
profileRouter.put("/edit", userAuth, updateUserProfile);
profileRouter.patch("/update-password",userAuth, updatePassword);

module.exports = profileRouter; 