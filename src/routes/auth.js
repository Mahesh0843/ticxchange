const express=require("express");
const authRouter=express.Router();
const {signup,logout,login}=require("../Controllers/authcontroller");
const { verifyPhoneNumber } = require('../Controllers/authcontroller');
const {verifyEmail}=require("../Controllers/authcontroller");

authRouter.post("/signup",signup);
authRouter.post("/login",login);
authRouter.post("/logout",logout);
authRouter.get("/verify-email",verifyEmail);
authRouter.post('/verify-phone', verifyPhoneNumber);

module.exports = authRouter;