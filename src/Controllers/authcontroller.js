// src/controllers/auth.controller.js
const express = require("express");
const app = express();
require('dotenv').config({ path: './src/.env' });
const { validateSignup } = require("../utils/validation");
const User = require("../models/User");
const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');

const SALT_ROUNDS = 10;

// Nodemailer Transporter configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Signup a new user:
 * - Validates input
 * - Checks for duplicate email/phoneNumber
 * - Hashes the password
 * - Creates the user in the database
 * - Generates an email verification token and sends an email
 */
exports.signup = async (req, res) => {
  try {
    // Validate the request data
    validateSignup(req);

    let { 
      firstName, 
      lastName, 
      email, 
      password,
      phoneNumber,
      role = 'buyer'
    } = req.body;
    phoneNumber = `+91${phoneNumber}`;

    // Check if a user with the same email or phone number already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() }, 
        { phoneNumber }
      ]
    });

    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        message: existingUser.email === email.toLowerCase() 
          ? 'Email already registered' 
          : 'Phone number already registered'
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create the user
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      phoneNumber,
      role,
      isVerified: false
    });

    // Generate a token for email verification (expires in 24 hours)
    const token = jwt.sign(
      { 
        _id: user._id,
        email: user.email 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    // Build the verification link
    const verificationLink = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

    // Send the verification email
    await transporter.sendMail({
      to: email,
      subject: 'Welcome to Ticxchange - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: rgba(55,68,98,255); padding: 20px; text-align: center; color: #fff;">
            <img src="https://media-hosting.imagekit.io//21c734e810444e2d/WhatsApp%20Image%202025-01-06%20at%2009.53.33_a530b1bc.jpg?Expires=1832139135&Key-Pair-Id=K2ZIVPTIP2VGHC&Signature=WkKon~T9v93sjYASLKVcY44Szj3i1JdjMBUUoTavvgGQtMc3fTPH9HYLFx88dxrC3DD3kf1tElWGEbVqAZs2MvBByQstnHdOzgr3u78El7PcHBozhWYOwCS2-tEX2JxVr9uFNShQKvVEXoOlNPDHHmA4WxSr4fkfFpLlDSX9IyExnC4EMlohXIaPzTI0bC0Mi04EiOm2I0iPWz2vmh-a3HIcrTdbwusuERnrPJVfGRZ8ZWGgLtn1Og3WDA88DTlpqFGLesqAaO9KTjmndJzw~ZxHWxr3oEYsvHDsXFLU5XEB~2dLAS9XdGy4hU3QReEi5lHJB5dKKZ2U7adVo4pswQ__" 
                 alt="Ticxchange Logo" 
                 width="200">
            <h2>Welcome to Ticxchange!</h2>
          </div>
          <div style="padding: 20px; text-align: center;">
            <p>Hi ${firstName},</p>
            <p>Thanks for signing up. Please verify your email address to get started.</p>
            <a href="${process.env.CLIENT_URL}/verify-email?token=${token}" 
               style="background-color: rgba(55,68,98,255); 
                      color: #faf8e7; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      font-size: 18px; 
                      border-radius: 4px; 
                      display: inline-block;
                      margin: 20px 0;">
              Verify Email Address
            </a>
            <p style="margin-top: 20px;">Or copy and paste this link in your browser:</p>
            <p style="color: #0176D3; word-break: break-all;">${process.env.CLIENT_URL}/verify-email?token=${token}</p>
            <p>This link will expire in 24 hours.</p>
          </div>
          <div style="background-color: #f4f4f4; padding: 15px; font-size: 12px; text-align: center; color: #666;">
            <p>© ${new Date().getFullYear()} Ticxchange. All rights reserved.</p>
          </div>
        </div>
      `
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      data: {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber,
          role: user.role,
          photoUrl: user.photoUrl
        }
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(400).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Login an existing user:
 * - Validates request input
 * - Finds the user and ensures that the email is verified
 * - Checks the password
 * - Resets login attempts and updates last login date if needed
 * - Generates a JWT and sends it as a cookie and in the response
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Find the user and select sensitive fields for authentication
    const user = await User.findOne({ email: email.toLowerCase() })
    .select('+password +loginAttempts +lockUntil +phoneVerified +isVerified');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email to login"
      });
    }

    // Compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      if (typeof user.incrementLoginAttempts === 'function') {
        await user.incrementLoginAttempts();
      }
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Reset login attempts on successful login
    if (typeof user.resetLoginAttempts === 'function') {
      await user.resetLoginAttempts();
    }
    
    // Update last login time and save
    user.lastLogin = new Date();
    await user.save();

    // Generate a JWT token (expires in 24 hours)
    const token = jwt.sign(
      { 
        _id: user._id,
        role: user.role 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    // res.cookie('token', token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production', // true in production
    //   sameSite: 'lax',
    //   maxAge: 24 * 60 * 60 * 1000 // 24 hours
    // });
    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // Required for HTTPS
      sameSite: 'none', // Required for cross-site cookies
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          ...user.toObject({
            virtuals: true,
            transform: (doc, ret) => {
              delete ret.password;
              delete ret.loginAttempts;
              delete ret.lockUntil;
              return ret;
            }
          }),
          phoneVerified: user.phoneVerified
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify a user's email:
 * - Extracts and verifies the token
 * - Marks the user as verified if the token is valid
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query; // Token passed as query parameter
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { _id } = decoded;

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).send("User not found");
    }

    if (user.isVerified) {
      return res.send("Email is already verified");
    }

    user.isVerified = true;
    await user.save();

    res.send("Email verified successfully");
  } catch (err) {
    console.error('verifyEmail error:', err);
    res.status(400).send("Invalid or expired token");
  }
};


/**
 * Logout a user:
 * - Clears the token cookie
 */
exports.logout = async (req, res) => {
  res.cookie("token", null, {
    expires: new Date(Date.now())
  });
  res.send("Logout Successful!");
};
