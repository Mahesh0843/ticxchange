const express=require("express");
const User = require('../models/User');
const {validateEditProfileData,validateinputs, validateLoginPassword}=require("../utils/validation");
const bcrypt=require("bcrypt");
const twilio = require("twilio");
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  
  
// exports.profileview = async (req, res) => {
//   try {
//     const user = req.user;
//     return res.status(200).json({
//       success: true,
//       message: "Profile retrieved successfully",
//       data: {
//         user: {
//           ...user.toObject(),
//           phoneVerified: user.phoneVerified || false,
//           password: undefined,
//           loginAttempts: undefined,
//           lockUntil: undefined
//         }
//       }
//     });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// };
// exports.profileview = async (req, res) => {
//   try {
//     const user = req.user;

//     // Convert Mongoose document to a plain object
//     const userData = user.toObject();

//     // Explicitly include phoneVerified and exclude sensitive fields
//     const responseData = {
//       ...userData,
//       phoneVerified: userData.phoneVerified || false, // Ensure phoneVerified is included
//       password: undefined, // Exclude sensitive fields
//       loginAttempts: undefined,
//       lockUntil: undefined
//     };

//     return res.status(200).json({
//       success: true,
//       message: "Profile retrieved successfully",
//       data: {
//         user: responseData
//       }
//     });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// };
exports.profileview = async (req, res) => {
  try {
    // Get the latest user data from the database
    const user = await User.findById(req.user._id).select('+phoneVerified').lean(); // .lean() returns a plain JS object

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove sensitive fields
    delete user.password;
    delete user.loginAttempts;
    delete user.lockUntil;

    return res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: { user }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update Password
exports.updatePassword = async (req, res) => {
  const loginuser = req.user;
  const { emailId, oldpassword, newPassword } = req.body;

  try {
    validateinputs(emailId, oldpassword, newPassword);
    const user = await User.findOne({ email: emailId });

    if (!user) {
      throw new Error("User not found.");
    }

    if (user.id !== loginuser.id) {
      return res.status(403).json({ message: "Unauthorized to update this password." });
    }

    validateLoginPassword(oldpassword, user.password);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;

    await user.save();

    res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// exports.updateUserProfile = async (req, res) => { 
//   try {
//     if (!validateEditProfileData(req)) {
//       throw new Error("Invalid Edit Request");
//     }

//     const user = await User.findByIdAndUpdate(
//       req.user._id,
//       {
//         $set: {
//           firstName: req.body.firstName,
//           lastName: req.body.lastName,
//           photoUrl: req.body.photoUrl
//         }
//       },
//       { new: true, runValidators: true }
//     ).select('-password -loginAttempts -lockUntil');

//     if (!user) {
//       throw new Error("User not found");
//     }

//     return res.status(200).json({
//       success: true,
//       message: `${user.firstName}, your profile has been updated!`,
//       data: {
//         user: {
//           ...user.toObject({ virtuals: true }),
//           phoneVerified: user.phoneVerified
//         },
//         token: req.cookies.token
//       }
//     });

//   } catch (err) {
//     res.status(400).json({ 
//       success: false,
//       error: err.message 
//     });
//   }
// };

  // Send OTP for Phone Verification

  exports.updateUserProfile = async (req, res) => { 
    try {
      if (!validateEditProfileData(req)) {
        throw new Error("Invalid Edit Request");
      }

      // Check if the phone number is verified
      if (user.phoneVerified) {
        return res.status(403).json({ message: "Phone number is already verified and cannot be updated." });
      }

      // Validate phone number format (10 digits)
      const phoneRegex = /^\d{10}$/; // Regex for 10 digits
      if (phoneNumber && !phoneRegex.test(phoneNumber)) {
        return res.status(400).json({ message: "Phone number must be 10 digits." });
      }

      // Add +91 prefix if not already present
      if (phoneNumber && !phoneNumber.startsWith('+91')) {
        user.phoneNumber = `+91${phoneNumber}`;
      } else {
        user.phoneNumber = phoneNumber; // Update phone number if provided
      }

      // Update other user fields
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      user.photoUrl = photoUrl || user.photoUrl;
      user.phoneVerified = false;
      await user.save();

      return res.status(200).json({
        success: true,
        message: `${user.firstName}, your profile has been updated!`,
        data: {
          user: {
            ...user.toObject({ virtuals: true }),
            phoneVerified: user.phoneVerified
          }
        }
      });

    } catch (err) {
      res.status(400).json({ 
        success: false,
        error: err.message 
      });
    }
  };
  exports.sendOTP = async (req, res) => {
    try {
      const { phoneNumber } = req.body;
  
      // Ensure +91 is prefixed only if not already present
      const formattedPhone = phoneNumber.startsWith("+91") ? phoneNumber : `+91${phoneNumber}`;
  
      // Validate phone number format
      if (!formattedPhone.match(/^\+91\d{10}$/)) {
        return res.status(400).json({ error: 'Invalid phone number format' });
      }
  
      await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications
        .create({ to: formattedPhone, channel: 'sms' });
  
      res.json({ success: true, message: 'OTP sent successfully!' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  };
  
  
  // Verify OTP for Phone Verification
exports.verifyOTP = async (req, res) => {
    try {
      const { phoneNumber, code } = req.body;
  
      const formattedPhone = phoneNumber.startsWith("+91") ? phoneNumber : `+91${phoneNumber}`;
  
      const verification = await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks
        .create({ to: formattedPhone, code });
  
      if (verification.status === 'approved') {
        const user = await User.findOneAndUpdate(
          { phoneNumber: formattedPhone },
          { phoneVerified: true },
          { new: true }
        );
  
        if (!user) {
          throw new Error('User not found.');
        }
  
        return res.json({ success: true, message: 'Phone number verified successfully!', data: { phoneVerified: user.phoneVerified }  });
      }
  
      res.status(400).json({ error: 'Invalid verification code' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  };
  