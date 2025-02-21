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
    //   secure: false, // false for HTTP in development
    //   sameSite: 'lax',
    //   maxAge: 24 * 60 * 60 * 1000, // 24 hours
    //   path: '/' // Add this to ensure the cookie is available across all paths
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
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { _id } = decoded;

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isVerified) {
      return res.status(200).json({
        success: true,
        message: "Email is already verified"
      });
    }

    user.isVerified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully"
    });

  } catch (err) {
    console.error('verifyEmail error:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        message: "Invalid verification token"
      });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: "Verification token has expired"
      });
    }
    return res.status(500).json({
      success: false,
      message: "Error verifying email"
    });
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

/**
 * Handle forgot password request:
 * - Validates email
 * - Generates reset token
 * - Sends reset email
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Please provide email" });
    }

    const checkUser = await User.findOne({ email: email.toLowerCase() });

    if (!checkUser) {
      return res.status(400).json({ message: "User not found, please register" });
    }

    // Generate reset token
    const token = jwt.sign({ email: checkUser.email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Create reset link
    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

    // Send email with styled template
    await transporter.sendMail({
      to: email,
      subject: 'Ticxchange - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: rgba(55,68,98,255); color: #faf8e7; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Password Reset Request</h1>
          </div>
          <div style="padding: 20px; text-align: center;">
            <p style="font-size: 16px;">Hi ${checkUser.firstName},</p>
            <p style="font-size: 16px;">We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="${resetLink}" 
               style="background-color: rgba(55,68,98,255); 
                      color: #faf8e7; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      font-size: 18px; 
                      border-radius: 4px; 
                      display: inline-block;
                      margin: 20px 0;">
              Reset Password
            </a>
            <p style="margin-top: 20px; font-size: 14px;">Or copy and paste this link in your browser:</p>
            <p style="color: #0176D3; word-break: break-all;">${resetLink}</p>
            <p style="margin-top: 20px; font-size: 14px;">This link will expire in 1 hour.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="font-size: 14px; color: #666;">
                If you didn't request this password reset, you can safely ignore this email.
              </p>
            </div>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>© ${new Date().getFullYear()} Ticxchange. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      `
    });

    return res.status(200).json({
      success: true,
      message: "Password reset link sent successfully to your email",
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

/**
 * Reset password using token:
 * - Validates token
 * - Updates password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.query; // Use query params for token
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Please provide password" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

/**
 * Verify reset password token:
 * - Validates token without changing password
 */
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required"
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Token is valid",
      data: {
        email: user.email
      }
    });

  } catch (error) {
    console.error('Verify reset token error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token"
      });
    }
    return res.status(500).json({
      success: false,
      message: "Error verifying reset token"
    });
  }
};

/**
 * Change password for authenticated user:
 * - Validates current password
 * - Updates to new password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id; // From auth middleware

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }

    // Find user and include password field
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: "Error changing password",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Submit a suggestion from any user:
 * - Checks if the email exists in the database
 * - Sends the suggestion to the admin email
 */
exports.submitSuggestion = async (req, res) => {
  try {
    const { email, suggestion } = req.body;

    if (!email || !suggestion) {
      return res.status(400).json({ message: "Please provide both email and suggestion" });
    }

    // Check if the email exists in the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email not found. Please register first." });
    }

    // Send the suggestion email
    await transporter.sendMail({
      to: process.env.ADMIN_EMAIL, // Set your admin email here
      subject: `Suggestion from ${user.email}`,
      html: `
        <div>
          <h3>New Suggestion from ${user.email}</h3>
          <p><strong>Suggestion:</strong> ${suggestion}</p>
        </div>
      `
    });

    return res.status(200).json({ message: "Suggestion submitted successfully" });
  } catch (error) {
    console.error('Submit suggestion error:', error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};