const express=require("express");
const authRouter=express.Router();
const {signup,logout,login}=require("../controllers/authcontroller");
const { verifyPhoneNumber } = require('../controllers/authcontroller');
const {verifyEmail}=require("../controllers/authcontroller");

authRouter.post("/signup",signup);
authRouter.post("/login",login);
authRouter.post("/logout",logout);
authRouter.get("/verify-email",verifyEmail);
authRouter.post('/verify-phone', verifyPhoneNumber);

module.exports = authRouter;