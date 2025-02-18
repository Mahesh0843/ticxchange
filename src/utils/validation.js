const validator = require("validator");
const bcrypt = require('bcrypt');

exports.validateSignup = (req) => {
    const { 
        firstName, 
        lastName, 
        email, 
        password, 
        phoneNumber, 
        role,
        photoUrl 
    } = req.body;

    // Validate first name
    if (!firstName || firstName.trim().length < 2 || firstName.trim().length > 50) {
        throw new Error("First name must be between 2 and 50 characters.");
    }

    // Validate last name
    if (!lastName || lastName.trim().length < 2 || lastName.trim().length > 50) {
        throw new Error("Last name must be between 2 and 50 characters.");
    }

    // Validate email
    if (!email || !validator.isEmail(email)) {
        throw new Error("Please enter a valid email address.");
    }

    // Validate password
    if (!password || !validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
    })) {
        throw new Error("Password must be at least 8 characters long and include uppercase, lowercase, numbers, and symbols.");
    }

    // Validate Indian phone number (10-digit format)
    if (!phoneNumber || !phoneNumber.match(/^[6-9]\d{9}$/)) {
        throw new Error("Please enter a valid 10-digit Indian phone number.");
    }


    // Validate role
    if (role && !["buyer", "seller"].includes(role)) {
        throw new Error("Role must be either 'buyer' or 'seller'.");
    }

    // Validate photoUrl if provided
    if (photoUrl && !validator.isURL(photoUrl)) {
        throw new Error("Please provide a valid photo URL.");
    }
};

exports.validateEditProfileData = (req) => {
    const allowedEditFields = [
        "firstName",
        "lastName",
        "photoUrl",
    ];

    // Check if all provided fields are allowed to be edited
    const isEditAllowed = Object.keys(req.body).every((key) =>
        allowedEditFields.includes(key)
    );

    if (!isEditAllowed) {
        throw new Error("Invalid fields provided for update.");
    }

    // Validate individual fields if they exist in the request
    const { 
        firstName, 
        lastName,
        photoUrl,
    } = req.body;

    if (firstName && (firstName.trim().length < 2 || firstName.trim().length > 50)) {
        throw new Error("First name must be between 2 and 50 characters.");
    }

    if (lastName && (lastName.trim().length < 2 || lastName.trim().length > 50)) {
        throw new Error("Last name must be between 2 and 50 characters.");
    }

    if (photoUrl && !validator.isURL(photoUrl)) {
        throw new Error("Please provide a valid photo URL.");
    }
    
    return true;
};
exports.validateLoginPassword = async (password, passwordHash) => {
    if (!password || !passwordHash) {
        throw new Error("Password and hash are required.");
    }

    try {
        const isMatch = await bcrypt.compare(password, passwordHash);
        if (!isMatch) {
            throw new Error("Invalid credentials.");
        }
        return true;
    } catch (error) {
        throw new Error("Error validating password.");
    }
};

// Additional validation helpers
exports.validateOTP = (otp) => {
    if (!otp || typeof otp !== 'string' || otp.length !== 6 || !/^\d+$/.test(otp)) {
        throw new Error("Invalid OTP format. Must be 6 digits.");
    }
    return true;
};

exports.validateAccountStatus = (status) => {
    if (!["active", "warned", "blocked"].includes(status)) {
        throw new Error("Invalid account status.");
    }
    return true;
};

exports.validateRating = (rating) => {
    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        throw new Error("Rating must be between 1 and 5.");
    }
    return true;
};