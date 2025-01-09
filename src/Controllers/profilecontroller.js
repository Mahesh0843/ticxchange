const express=require("express");
const User = require('../models/User');
const {validateEditprofileData,validateinputs, validateloginpassword}=require("../utils/validation");
const bcrypt=require("bcrypt");

exports.profileview=async (req,res)=>{
    try{
        const user = req.user;
        res.send(user);
    }
    catch(err)
    {
        res.status(400).send("ERROR : " + err.message);
    }
};


exports.updateUserProfile = async(req,res)=>{
    try{
        if(!validateEditprofileData(req))
        {
            throw new Error("Invalid Edit Request");
        }
        const loginuser=req.user;
        Object.keys(req.body).forEach((k)=>{
            loginuser[k]=req.body[k];
        });
        await loginuser.save();
        res.status(200).json({
            message:`${loginuser.firstName},your profile Updated!!`,
            data: loginuser,
        });
    }
    catch(err){
        res.status(400).send("ERROR : " + err.message);
    }   
};

exports.updatePassword = async (req, res) => {
    const loginuser = req.user;
    const { emailId, oldpassword, newPassword } = req.body;

    try {
        validateinputs(emailId, oldpassword, newPassword);
        const user = await User.findOne({ 
            email: emailId });

        if (!user) {
            throw new Error("User not found.");
        }

        if (user.id !== loginuser.id) {
            return res.status(403).json({ message: "Unauthorized to update this password." });
        }

        validateloginpassword(oldpassword, user.password);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        
        await user.save();

        res.status(200).json({ message: "Password updated successfully." });
    } catch (err) {
        res.status(400).send("ERROR : " + err.message); // Fixed error handling
    }
};
