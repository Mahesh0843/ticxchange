const express=require("express");
const app=express();

const {validatesignup,validateloginpassword}= require("../utils/validations");
const User=require("../models/User");
const bcrypt=require("bcrypt");
const jwt = require("jsonwebtoken");

exports.signup= async (req,res)=>{
    try{
        validatesignup(req);
        const salt = await bcrypt.genSalt(10);
        const {firstName,lastName,emailId,password}=req.body;
        const passwordHash=await bcrypt.hash(password,salt);
        const user = await User.create({firstName,lastName,emailId,password:passwordHash});
        res.status(201).json({ message: 'User Signup successfully' });

    }
    catch(err)
    {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'User signup failed' });
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
  