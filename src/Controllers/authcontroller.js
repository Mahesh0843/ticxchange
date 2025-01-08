const express=require("express");
const app=express();

const {validatesignup,validateloginpassword}= require("../utils/validations");
const User=require("../models/User");
const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs');

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'process.env.EMAIL_USER',
    pass: 'process.env.EMAIL_PASS'
  }
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

    // Generate Token for Verification
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Verification Email
    const verificationLink = `http://localhost:5000/api/auth/verify-email?token=${token}`;
    await transporter.sendMail({
      to: email,
      subject: 'Verify Your Email',
      html: `<p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`
    });

    res.status(201).json({ message: 'Signup successful! Verification email sent.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
  