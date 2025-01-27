const validator = require("validator");
const bcrypt = require('bcrypt');

exports.validatesignup = (req) => {
    const { name, email, password, phoneNumber, role } = req.body;

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

    if (!phoneNumber || !validator.isMobilePhone(phoneNumber, "any")) {
        throw new Error("Phone number is not valid.");
    }

};

exports.validateEditprofileData=(req)=>{
    const allowedEditFields=[
        "name",
        "email",
        "role",
    ];
    const isEditAllowed=Object.keys(req.body).every((key)=>
    allowedEditFields.includes(key));
    return isEditAllowed;
};

exports.validateloginpassword= async (password,passwordHash) =>
{
        console.log("Provided Password:", password);
        console.log("Stored Hash:", passwordHash);
        const isMatch = await bcrypt.compare(password, passwordHash);

        if(!isMatch)
        {
            throw new Error("Invalid credentials");
        }
};


