const validator = require("validator");

exports.validatesignup = (req) => {
    const { name, email, password, phoneNumber, role } = req.body;

    // Validate name
    if (!name || name.trim().length === 0) {
        throw new Error("Name is required and cannot be empty.");
    }

    // Validate email
    if (!email || !validator.isEmail(email)) {
        throw new Error("Email is not valid!");
    }

    // Validate password
    if (!password || !validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
    })) {
        throw new Error("Password must be strong (at least 8 characters, including uppercase, lowercase, numbers, and symbols).");
    }

    // Validate phone number
    if (!phoneNumber || !validator.isMobilePhone(phoneNumber, "any")) {
        throw new Error("Phone number is not valid.");
    }

};
