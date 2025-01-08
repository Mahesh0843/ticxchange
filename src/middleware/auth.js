const jwt=require("jsonwebtoken");
const User=require("../models/User");

const userAuth= async (req,res,next) =>{
    try{
    const {token}=req.cookies;
    if(!token)
    {
        return res.status(401).send("PLease Login!!");
    }
    const decoded=await jwt.verify(token,process.env.JWT_SECRET);
    console.log('decoded token ', decoded);
    const {_id}= decoded;
    const user=await User.findById(_id);
    if(!user)
    {
        throw new Error("User Not Found");
    }
    req.user=user;
    next();
}
catch(err){
    res.status(400).send("Error:"+err.message);
}
};

module.exports={userAuth};