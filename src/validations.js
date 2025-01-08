const validator=require("validator");
const bcrypt=require("bcrypt");
exports.validatesignup=(req)=>{
    const {name, email, password, phoneNumber, role }=req.body;
    if(!name)
    {
        throw new Error("Name is not valid");
    }
    else if(!validator.isEmail(email))
    {
        throw new Error("Email is not valid!!");
    }
    else if(!validator.isStrongPassword(password))
    {
        throw new Error("please enter strong password");
    }
    
};