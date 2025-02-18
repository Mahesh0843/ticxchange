const express=require("express");
const authRouter=express.Router();
const {signup,logout,login}=require("../controllers/authcontroller");
const { verifyPhoneNumber } = require('../controllers/authcontroller');
const {verifyEmail}=require("../controllers/authcontroller");
const { userAuth } = require("../middleware/auth");

authRouter.post("/signup",signup);
authRouter.post("/login",login);
authRouter.post("/logout",logout);
authRouter.get("/verify-email",verifyEmail);
module.exports = authRouter;