const express=require("express");
const app=express();
require('dotenv').config({ path: './src/.env' });
const {validatesignup,validateloginpassword}= require("../utils/validation");
const User=require("../models/User");
const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');


// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// User Signup
exports.signup = async (req, res) => {
  try {
    validatesignup(req);
    const { name, email, password, phoneNumber, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({ name, email, password: hashedPassword, phoneNumber, role });

    const use = await User.findOne({ email });
    // Generate Token for Verification
    console.log(use._id);
    const token = jwt.sign({ _id: use._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    // Verification Email
    const verificationLink = `${process.env.CLIENT_URL}/api/auth/verify-email?token=${token}`;
    await transporter.sendMail({
      to: email,
      subject: 'Verify Your Email',
      html: `<p style="font-size: 18px;">Click <a href="${verificationLink}">here</a> to verify your email.</p>`
    });

    res.status(201).json({ message: 'Signup successful! Verification email sent.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query; // Extract the token from the query string
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token
    console.log(decoded);
    const { _id } = decoded;

    const user = await User.findById(_id); // Find the user by ID
    if (!user) {
      return res.status(404).send("User not found");
    }

    if (user.isVerified) {
      return res.send("Email is already verified");
    }

    user.isVerified = true; // Update the user's verification status
    await user.save();

    res.send("Email verified successfully");
  } catch (err) {
    console.error(err);
    res.status(400).send("Invalid or expired token");
  }
};





exports.verifyPhoneNumber = async (req, res) => {
    try {
      const { phoneNumber, token } = req.body;
  
      if (!phoneNumber || !token) {
        return res.status(400).json({ message: 'Phone number and token are required' });
      }
  
      // Verify Firebase Token
      const decodedToken = await admin.auth().verifyIdToken(token);
      if (decodedToken.phone_number !== phoneNumber) {
        return res.status(400).json({ message: 'Invalid phone number verification.' });
      }
  
      // Update User Phone Verification Status
      const user = await User.findOne({ phoneNumber });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      user.isPhoneVerified = true;
      await user.save();
  
      res.status(200).json({ message: 'Phone number successfully verified!' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Phone verification failed', error: error.message });
    }
  };



exports.login= async (req,res)=>{
    try{
    const {emailId,password}=req.body;
    const user=await User.findOne({emailId:emailId});
    if(!user)
    {
        throw new Error("Invalid credentials");
    }
    await validateloginpassword(password, user.password);
    const token = jwt.sign({_id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie("token",token,{
        expires: new Date(Date.now()+8*360000),
    });
    res.status(200).json({ token });
    }
    catch(err)
    {
        res.status(400).send("ERROR : " + err.message);
    }
};

exports.logout=async (req, res) => {
    res.cookie("token", null, {
      expires: new Date(Date.now()),
    });
    res.send("Logout Successful!!");
  };
  