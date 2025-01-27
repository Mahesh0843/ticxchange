const express = require('express');
const ticketRouter = express.Router();
const {userAuth} = require('../middleware/auth');
const {verifySeller} = require('../middleware/verifySeller');
const { verifyTicketCreateSuccessful} = require('../middleware/verifyTicket');
const { createManualTicket, createTicket, createUpdateLocation } = require('../controllers/ticketController');



const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});

const upload = multer({ storage });

// Route

ticketRouter.post(
  '/create',
  userAuth, 
  verifySeller,
  upload.single('ticketImage'),
  createTicket
);
ticketRouter.post('/manual',userAuth,verifySeller,createManualTicket);
ticketRouter.post('/location',userAuth,verifySeller,verifyTicketCreateSuccessful ,createUpdateLocation);

module.exports =ticketRouter;

