const express = require('express');
const ticketRouter = express.Router();
const {userAuth} = require('../middleware/auth');
const {verifySeller} = require('../middleware/verifySeller');
const { verifyTicketCreateSuccessful} = require('../middleware/verifyTicket');
const { 
  createManualTicket, 
  createTicket, 
  createUpdateLocation,
  updateTicket,
  deleteTicket,
  getTicket,
  getAllTickets,
  getSellerTickets,
  getNearbyTickets
} = require('../controllers/ticketController');
const {connectionReq} = require('../controllers/requestController');
const Ticket = require('../models/Ticket');
const Rating = require('../models/Rating');
const ConnectionRequest = require('../models/ConnectionRequest');
const moment = require('moment');

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

const upload = multer({
  storage
});

// Route
// const handleMulterError = (err, req, res, next) => {
//   if (err instanceof multer.MulterError) {
//     if (err.code === 'LIMIT_FILE_SIZE') {
//       return res.status(400).json({ error: 'File size is too large. Maximum size is 5MB.' });
//     }
//     return res.status(400).json({ error: 'File upload error: ' + err.message });
//   }
//   if (err) {
//     return res.status(400).json({ error: err.message });
//   }
//   next();
// };

ticketRouter.post(
  '/tickets/create',
  userAuth,
  verifySeller,
  upload.single('ticketImage'),
  createTicket
);

ticketRouter.post(
  '/tickets/manual',
  userAuth,
  verifySeller,
  upload.single('ticketImage'),
  createManualTicket
);
// ticketRouter.post('/tickets/location',userAuth,verifySeller,verifyTicketCreateSuccessful ,createUpdateLocation);




// Update Routes
ticketRouter.put('/tickets/location/:id', userAuth, verifySeller, createUpdateLocation);
ticketRouter.put('/tickets/update/:id', userAuth, verifySeller, updateTicket);

// Delete Route
ticketRouter.delete('/tickets/delete/:id', userAuth, verifySeller, deleteTicket);


// Connection Request Routes
ticketRouter.post(
  '/tickets/connect/:ticketId/:toUserId',
  userAuth,
  connectionReq
);

// Mark ticket as sold (Seller endpoint)
ticketRouter.post('/tickets/:ticketId/mark-sold', userAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { buyerId } = req.body;
    
    const ticket = await Ticket.findOneAndUpdate(
      {
        _id: ticketId,
        sellerId: req.user._id,
        status: 'available'
      },
      {
        status: 'pending',
        buyerId,
        isAvailable: false
      },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found or not available' });
    }

    res.json({ message: 'Ticket marked as pending', ticket });
  } catch (error) {
    console.error('Mark as sold error:', error);
    res.status(500).json({ error: 'Failed to mark ticket as sold' });
  }
});

// Confirm purchase (Buyer endpoint)
// ticketRouter.post('/tickets/:ticketId/confirm', userAuth, async (req, res) => {
//   try {
//     const { ticketId } = req.params;
    
//     const ticket = await Ticket.findOneAndUpdate(
//       {
//         _id: ticketId,
//         buyerId: req.user._id,
//         status: 'pending'
//       },
//       {
//         status: 'sold',
//         confirmedAt: new Date(),
//         isAvailable: false,
//         soldAt: new Date()
//       },
//       { new: true }
//     );

//     if (!ticket) {
//       return res.status(404).json({ error: 'Ticket not found or not pending' });
//     }

//     // Schedule archiving of accepted connections after 24 hours
//     const archiveTime = moment().add(2, 'minutes').toDate();
    
//     // Update accepted connections to be archived after 24 hours
//     await ConnectionRequest.updateMany(
//       { 
//         ticketId,
//         status: 'accepted'
//       },
//       {
//         $set: {
//           status: 'pending_archive',
//           archiveScheduledAt: archiveTime
//         }
//       }
//     );

//     // Immediately delete all 'interested' status connections
//     await ConnectionRequest.deleteMany({
//       ticketId,
//       status: 'interested'
//     });

//     // Set up a delayed job to archive connections after 24 hours
//     setTimeout(async () => {
//       try {
//         await ConnectionRequest.updateMany(
//           {
//             ticketId,
//             status: 'pending_archive'
//           },
//           {
//             $set: {
//               status: 'archived',
//               archivedAt: new Date()
//             }
//           }
//         );
//         console.log(`Archived connections for ticket ${ticketId} after 24 hours`);
//       } catch (error) {
//         console.error('Error archiving connections:', error);
//       }
//     }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

//     res.json({ 
//       message: 'Purchase confirmed and connections updated', 
//       ticket 
//     });

//   } catch (error) {
//     console.error('Confirm purchase error:', error);
//     res.status(500).json({ error: 'Failed to confirm purchase' });
//   }
// });

// Confirm purchase (Buyer endpoint)
ticketRouter.post('/tickets/:ticketId/confirm', userAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    // Update ticket status to 'sold'
    const ticket = await Ticket.findOneAndUpdate(
      {
        _id: ticketId,
        buyerId: req.user._id,
        status: 'pending'
      },
      {
        status: 'sold',
        confirmedAt: new Date(),
        isAvailable: false,
        soldAt: new Date()
      },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found or not pending' });
    }

    // Schedule archiving of accepted connections after 2 minutes
    const archiveTime = moment().add(2, 'minutes').toDate();
    
    // Update accepted connections to be archived after 2 minutes
    await ConnectionRequest.updateMany(
      { 
        ticketId,
        status: 'accepted'
      },
      {
        $set: {
          status: 'pending_archive',
          archiveScheduledAt: archiveTime
        }
      }
    );

    // Immediately delete all 'interested' status connections
    await ConnectionRequest.deleteMany({
      ticketId,
      status: 'interested'
    });

    // Set up a delayed job to archive connections after 2 minutes
    setTimeout(async () => {
      try {
        await ConnectionRequest.updateMany(
          {
            ticketId,
            status: 'pending_archive'
          },
          {
            $set: {
              status: 'archived',
              archivedAt: new Date()
            }
          }
        );
        console.log(`Archived connections for ticket ${ticketId} after 2 minutes`);
      } catch (error) {
        console.error('Error archiving connections:', error);
      }
    }, 2 * 60 * 1000); // 2 minutes in milliseconds

    res.json({ 
      message: 'Purchase confirmed and connections updated', 
      ticket 
    });

  } catch (error) {
    console.error('Confirm purchase error:', error);
    res.status(500).json({ error: 'Failed to confirm purchase' });
  }
});

// Submit review (Buyer endpoint)
ticketRouter.post('/tickets/:ticketId/review', userAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { rating, comment } = req.body;
    
    const ticket = await Ticket.findOne({
      _id: ticketId,
      buyerId: req.user._id,
      status: 'sold'
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found or not eligible for review' });
    }

    const newRating = new Rating({
      fromUser: req.user._id,
      toUser: ticket.sellerId,
      ticketId,
      rating,
      comment,
      type: 'seller'
    });

    await newRating.save();

    res.json({ message: 'Review submitted successfully', rating: newRating });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

module.exports =ticketRouter;

