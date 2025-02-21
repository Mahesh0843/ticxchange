const express = require("express");
const authRouter = express.Router();
const {
  signup,
  logout,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  submitSuggestion,
  verifyResetToken
} = require("../Controllers/authcontroller");
// const { verifyPhoneNumber } = require('../controllers/authcontroller');
// const {verifyEmail}=require("../Controllers/authcontroller");
const { userAuth } = require("../middleware/auth")

authRouter.post("/signup", signup);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.get("/verify-email", verifyEmail);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPassword);
authRouter.post('/change-password', userAuth, changePassword);
authRouter.get('/verify-reset-token', verifyResetToken);
authRouter.post('/submit-suggestion',userAuth, submitSuggestion);
module.exports = authRouter;