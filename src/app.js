require('dotenv').config({ path: './src/.env' });

const express = require('express');
const connectDB = require('./Config/db'); 
const cookieParser = require('cookie-parser'); 
const authRoutes = require('./routes/auth'); 
const ticketRoutes = require('./routes/tickets');
const profileRoutes = require('./routes/profile');
const viewticketRoutes = require('./routes/viewtickets');
const userRoutes = require('./routes/user');
const requestRoutes = require('./routes/connection');
const app = express();
const cors=require("cors");
const http=require("http");
const initializeSocket = require("./utils/socket");
const chatRouter = require('./routes/Chat');
const reviewRouter = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const cleanupExpiredTickets = require('./crons/ticketCleanup');

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/', authRoutes); 
app.use('/',profileRoutes);
app.use('/',ticketRoutes);
app.use('/',viewticketRoutes); 
app.use('/',userRoutes);
app.use('/',requestRoutes);
app.use('/',chatRouter);
app.use('/', reviewRouter);
app.use('/notifications', notificationRoutes);


const server=http.createServer(app);
initializeSocket(server);

// Initialize the ticket cleanup cron job
cleanupExpiredTickets();

// Database Connection
connectDB()
  .then(() => {
    console.log("Database connected!!");
    console.log('Database URL:', process.env.DATABASE_URL); 
    const PORT = process.env.PORT || 5000; 
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed!", err); 
  });

module.exports = app;