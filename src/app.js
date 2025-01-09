require('dotenv').config({ path: './src/.env' });

const express = require('express');
const connectDB = require('./Config/db'); 
const cookieParser = require('cookie-parser'); 
const authRoutes = require('./routes/auth'); 

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes); 

// Database Connection
connectDB()
  .then(() => {
    console.log("Database connected!!");
    console.log('Database URL:', process.env.DATABASE_URL); 
    const PORT = process.env.PORT || 5000; 
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed!", err); 
  });