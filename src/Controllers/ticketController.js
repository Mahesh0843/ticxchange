const moment = require('moment');
const Ticket = require('../models/Ticket');
const { performOCR } = require('../utils/ocrUtils');
const { uploadToCloudinary } = require('../utils/cloudinaryUtils'); // Replace Firebase with Cloudinary
const { extractFields, generateUniqueIdentifier } = require('../utils/validationUtils');
const fetch = require('node-fetch'); // Ensure fetch is available in Node.js
require('dotenv').config({ path: './src/.env' });
const ConnectionRequest = require('../models/ConnectionRequest');
const fs = require('fs/promises');





// exports.createManualTicket = async (req, res) => {
//   try {
//     console.log('Request body:', req.body); // Log the incoming request body
//     console.log('Authenticated user:', req.user); // Log the authenticated user

//     const { ticketId, eventName, eventDate, seatNumber, price, numberOfTickets, venue } = req.body;

//     // Validate required fields
//     if (!ticketId || !eventName || !eventDate || !seatNumber || !price || !numberOfTickets || !venue) {
//       console.error('Missing required fields in request body');
//       return res.status(400).json({ message: 'All fields are required1.' });
//     }

//     // Generate unique identifier
//     const uniqueIdentifier = generateUniqueIdentifier(ticketId, eventName, venue, seatNumber);
//     console.log('Generated unique identifier:', uniqueIdentifier);

//     // Check for duplicate tickets
//     const existingTicket = await Ticket.findOne({ uniqueIdentifier });
//     if (existingTicket) {
//       console.error('Duplicate ticket detected:', existingTicket);
//       return res.status(400).json({ error: 'Duplicate ticket detected.' });
//     }

//     // Create new ticket
//     const newTicket = new Ticket({
//       ticketId,
//       eventName,
//       eventDate,
//       seatNumber,
//       price,
//       numberOfTickets,
//       venue,
//       uniqueIdentifier,
//       sellerId: req.user._id,
//       isAvailable: true,
//     });

//     // Save ticket to database
//     await newTicket.save();
//     console.log('Ticket created successfully:', newTicket);

//     // Send success response
//     res.status(201).json({ message: 'Ticket created successfully', ticket: newTicket });
//   } catch (error) {
//     console.error('Error in manual ticket creation:', error);
//     res.status(500).json({ error: 'Failed to create ticket' });
//   }
// };


exports.createManualTicket = async (req, res) => {
  try {
    const { file } = req;
    const { 
      ticketId, 
      eventName, 
      eventDate, 
      seatNumber, 
      price, 
      numberOfTickets, 
      venue,
      eventType
    } = req.body;

    if (!eventDate) {
      return res.status(400).json({ error: 'Event date is required' });
    }

    // Parse eventDate using moment
    const parsedEventDate = moment(eventDate, 'YYYY-MM-DD HH:mm:ss', true);

    // Validate if the eventDate format is correct
    if (!parsedEventDate.isValid()) {
      return res.status(400).json({ error: 'Invalid event date format. Use YYYY-MM-DD HH:mm:ss' });
    }

    // Convert to JavaScript Date object
    const formattedEventDate = parsedEventDate.toDate();

    // Prevent past dates
    if (parsedEventDate.isBefore(moment())) {
      return res.status(400).json({ message: 'The ticket date has already passed.' });
    }
    // Input validation
    if (!file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    if (!ticketId || !eventName || !eventDate || !seatNumber || 
        !price || !numberOfTickets || !venue || !eventType) {
      // Clean up uploaded file if validation fails
      await fs.unlink(file.path);
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Validate eventType
    const validEventTypes = ['MOVIE', 'SPORT', 'EVENT'];
    if (!eventType || !validEventTypes.includes(eventType.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event type. Must be MOVIE, SPORT, or EVENT'
      });
    }

    // Generate unique identifier before database operations
    const uniqueIdentifier = generateUniqueIdentifier(ticketId, eventName, venue, seatNumber);

    // Check for duplicate tickets
    const existingTicket = await Ticket.findOne({ uniqueIdentifier });
    if (existingTicket) {
      await fs.unlink(file.path);
      return res.status(400).json({ error: 'Duplicate ticket detected.' });
    }
    const defaultLocation = {
      type: 'Point',
      coordinates: [80.6480, 16.5062], // Vijayawada (longitude, latitude)
      city: 'Vijayawada'
    };

    // Create new ticket object
    const newTicket = new Ticket({
      ticketId,
      eventName,
      eventDate:formattedEventDate,
      seatNumber,
      price,
      numberOfTickets,
      venue,
      eventType: eventType.toUpperCase(),
      uniqueIdentifier,
      sellerId: req.user._id,
      isAvailable: true,
      location: defaultLocation
    });

    // Save ticket first to get _id
    await newTicket.save();

    // Upload image to Cloudinary and get URL
    const imageUrl = await uploadToCloudinary(file.path, newTicket._id);
    
    // Clean up local file after successful upload
    await fs.unlink(file.path);

    // Update ticket with image URL
    newTicket.imageUrl = imageUrl;
    await newTicket.save();

    // Send success response
    res.status(201).json({ 
      message: 'Ticket created successfully', 
      ticket: newTicket 
    });

  } catch (error) {
    // Clean up uploaded file if any error occurs
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    
    console.error('Error in manual ticket creation:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
};



exports.createTicket = async (req, res) => {
  try {
    const { file } = req;

    if (!file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    console.log('Uploaded file path:', file.path); 

    // Perform OCR
    const ocrText = await performOCR(file.path);

    // Extract ticket details
    const extractedFields = extractFields(ocrText);

    console.log('Extracted fields:', extractedFields);

    // Check for missing fields and log them
    const missingFields = [];
    if (!extractedFields.ticketId) missingFields.push('ticketId');
    if (!extractedFields.eventName) missingFields.push('eventName');
    if (!extractedFields.eventDate) missingFields.push('eventDate');
    if (!extractedFields.seatNumber) missingFields.push('seatNumber');
    if (!extractedFields.price) missingFields.push('price');
    if (!extractedFields.numberOfTickets) missingFields.push('numberOfTickets');
    if (!extractedFields.venue) missingFields.push('venue');
    
    if (missingFields.length > 0) {
      console.log('Missing fields:', missingFields.join(', '));
      return res.status(400).json({ message: 'Required fields are missing from the ticket.' });
    }


    if (!extractedFields.ticketId || !extractedFields.eventName || !extractedFields.eventDate) {
      return res.status(400).json({ message: 'Required fields are missing from the ticket.' });
    }
     // Validate event date
     extractedFields.eventDate = moment(extractedFields.eventDate).format('YYYY-MM-DD HH:mm:ss');

    const currentDateTime = moment().format('YYYY-MM-DD HH:mm:ss');
    if (moment(extractedFields.eventDate).isBefore(currentDateTime)) {
      return res.status(400).json({ message: 'The ticket date has already passed.' });
    }



    // Generate unique identifier
    extractedFields.uniqueIdentifier = generateUniqueIdentifier(
      extractedFields.ticketId,
      extractedFields.eventName,
      extractedFields.venue,
      extractedFields.seatNumber
    );

    // Check for duplicates
    const existingTicket = await Ticket.findOne({ uniqueIdentifier: extractedFields.uniqueIdentifier });
    if (existingTicket) {
      return res.status(400).json({ error: 'Duplicate ticket detected.' });
    }

   
    // Save ticket details
    const newTicket = new Ticket({
      ...extractedFields,
      sellerId: req.user._id,
      isAvailable: true,
    });
    await newTicket.save();

    // Upload image to Cloudinary
    const imageUrl = await uploadToCloudinary(file.path, newTicket._id);

    const fs = require('fs/promises');
    await fs.unlink(file.path); // Deletes local file
    
    // Update ticket with image URL
    newTicket.imageUrl = imageUrl;
    await newTicket.save();

    res.status(201).json({ message: 'Ticket created successfully', ticket: newTicket });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
};

// const cleanupConnections = async (ticketId) => {
//   try {
//     await ConnectionRequest.deleteMany({ ticketId });
//     console.log(`Cleaned up connections for ticket ${ticketId}`);
//   } catch (error) {
//     console.error('Error cleaning up connections:', error);
//   }
// };

// exports.createUpdateLocation = async (req, res) => {
//   try {
//     const { coordinates } = req.body;
//     const sellerId = req.user._id;

//     // Find ticket by seller ID
//     const ticket = await Ticket.findOne({ 
//       sellerId: sellerId,
//       isAvailable: true
//     });
//     if (!ticket) {
//       return res.status(404).json({ error: 'No available ticket found for this seller' });
//     }

//     if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
//       return res.status(400).json({ error: 'Invalid coordinates provided' });
//     }

//     const [latitude, longitude] = coordinates;

//     // Validate coordinate values
//     if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
//       return res.status(400).json({ error: 'Invalid coordinate values' });
//     }

//     // Fetch city from OpenWeatherMap API
//     const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
//     if (!OPENWEATHER_API_KEY) {
//       return res.status(500).json({ error: 'OpenWeather API key not configured' });
//     }

//     const openWeatherUrl = `http://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}`;
//     const response = await fetch(openWeatherUrl);
//     const result = await response.json();

//     if (!result || !Array.isArray(result) || result.length === 0 || !result[0].name) {
//       return res.status(400).json({ error: 'Unable to determine city from the provided coordinates' });
//     }

//     const city = result[0].name;


//     const updatedTicket = await Ticket.findByIdAndUpdate(
//       ticketId,
//       { 
//         location: { 
//           type: 'Point', 
//           coordinates: [longitude, latitude], // Store as [longitude, latitude] for GeoJSON
//           city 
//         } 
//       },
//       { new: true, runValidators: true }
//     );

//     res.status(200).json({
//       message: 'Location and city updated successfully',
//       ticket: updatedTicket,
//     });
//   } catch (error) {
//     console.error('Location update error:', error);
//     res.status(500).json({ error: 'Internal server error while updating location' });
//   }
// };


// exports.updateTicket = async (req, res) => {
//   try {
//     const sellerId = req.user._id;

//     // Find the ticket by seller ID
//     const ticket = await Ticket.findOne({ 
//       sellerId: sellerId,
//       isAvailable: true // Only update if ticket is still available
//     });

//     if (!ticket) {
//       return res.status(404).json({ message: "No available ticket found for this seller" });
//     }

//     // Update allowed fields
//     const allowedUpdates = {
//       eventName: req.body.eventName,
//       eventDate: req.body.eventDate,
//       seatNumber: req.body.seatNumber,
//       price: req.body.price,
//       numberOfTickets: req.body.numberOfTickets,
//       venue: req.body.venue,
//       isAvailable: req.body.isAvailable,
//       imageUrl: req.body.imageUrl,
//       location: req.body.location ? {
//         type: 'Point',
//         coordinates: req.body.location.coordinates,
//         city: req.body.location.city
//       } : undefined
//     };

//     // Filter out undefined values
//     Object.keys(allowedUpdates).forEach(key => 
//       allowedUpdates[key] === undefined && delete allowedUpdates[key]
//     );

//     // If ticket is being marked as unavailable
//     if (req.body.isAvailable === false) {
//       await cleanupConnections(ticket._id);
//     }

//     // Update the ticket
//     const updatedTicket = await Ticket.findByIdAndUpdate(
//       ticket._id,
//       { $set: allowedUpdates },
//       { new: true, runValidators: true }
//     );

//     res.json({
//       message: "Ticket updated successfully",
//       ticket: updatedTicket
//     });

//   } catch (err) {
//     res.status(400).json({
//       message: "Error updating ticket",
//       error: err.message
//     });
//   }
// };


// exports.deleteTicket = async (req, res) => {
//   try {
//     const sellerId = req.user._id;
//     const ticketId = req.params.id; // Get ticket ID from params

//     // Find the ticket first to verify ownership and existence
//     const ticket = await Ticket.findOne({ 
//       _id: ticketId,
//       sellerId: sellerId
//     });

//     if (!ticket) {
//       return res.status(404).json({ 
//         message: "Ticket not found or you don't have permission to delete it" 
//       });
//     }

//     // Check if ticket has pending connections
//     const hasConnections = await ConnectionRequest.exists({ ticketId });
//     if (hasConnections) {
//       // Delete associated connection requests first
//       await cleanupConnections(ticketId);
//     }

//     // Delete image from Cloudinary if exists
//     if (ticket.imageUrl) {
//       try {
//         const publicId = ticket.imageUrl.split('/').pop().split('.')[0];
//         await cloudinary.uploader.destroy(publicId);
//       } catch (cloudinaryError) {
//         console.error('Error deleting image from Cloudinary:', cloudinaryError);
//         // Continue with ticket deletion even if image deletion fails
//       }
//     }

//     // Delete the ticket
//     await Ticket.findByIdAndDelete(ticketId);

//     res.json({
//       message: "Ticket and associated data deleted successfully",
//       ticketId: ticket._id
//     });

//   } catch (err) {
//     console.error('Delete ticket error:', err);
//     res.status(500).json({
//       message: "Error deleting ticket",
//       error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
//     });
//   }
// };


const cleanupConnections = async (ticketId) => {
  try {
    await ConnectionRequest.deleteMany({ ticketId });
    console.log(`Cleaned up connections for ticket ${ticketId}`);
  } catch (error) {
    console.error('Error cleaning up connections:', error);
    throw error;
  }
};

exports.createUpdateLocation = async (req, res) => {
  try {
    const { coordinates } = req.body;
    const { id: ticketId } = req.params;
    const sellerId = req.user._id;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({ error: 'Invalid coordinates provided' });
    }

    const [longitude,latitude] = coordinates;

    // Validate coordinate values
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Invalid coordinate values' });
    }

    // Find ticket by ID and seller ID
    const ticket = await Ticket.findOne({ 
      _id: ticketId,
      sellerId,
      isAvailable: true
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found or not available' });
    }

    // Fetch city from OpenWeatherMap API
    const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
    if (!OPENWEATHER_API_KEY) {
      throw new Error('OpenWeather API key not configured');
    }

    const openWeatherUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}`;
    const response = await fetch(openWeatherUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch city data from OpenWeatherMap');
    }

    const result = await response.json();

    if (!result?.[0]?.name) {
      return res.status(400).json({ error: 'Unable to determine city from the provided coordinates' });
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      { 
        location: { 
          type: 'Point', 
          coordinates: [longitude, latitude],
          city: result[0].name
        } 
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Location and city updated successfully',
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(error.message.includes('API key') ? 500 : 400).json({ 
      error: error.message || 'Internal server error while updating location'
    });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    const sellerId = req.user._id;

    const ticket = await Ticket.findOne({ 
      _id: ticketId,
      sellerId,
      isAvailable: true
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found or not available" });
    }

    // Validate date if it's being updated
    if (req.body.eventDate && new Date(req.body.eventDate) < new Date()) {
      return res.status(400).json({ error: 'Event date cannot be in the past' });
    }

    const allowedUpdates = {
      eventName: req.body.eventName,
      eventDate: req.body.eventDate,
      seatNumber: req.body.seatNumber,
      price: req.body.price > 0 ? req.body.price : undefined,
      numberOfTickets: req.body.numberOfTickets > 0 ? req.body.numberOfTickets : undefined,
      venue: req.body.venue,
      isAvailable: req.body.isAvailable,
      location: req.body.location ? {
        type: 'Point',
        coordinates: req.body.location.coordinates,
        city: req.body.location.city
      } : undefined
    };

    // Remove undefined values
    Object.keys(allowedUpdates).forEach(key => 
      allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    if (req.body.isAvailable === false) {
      await cleanupConnections(ticketId);
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );

    res.json({
      message: "Ticket updated successfully",
      ticket: updatedTicket
    });

  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(400).json({
      error: error.message || "Error updating ticket"
    });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    const sellerId = req.user._id;

    const ticket = await Ticket.findOne({ 
      _id: ticketId,
      sellerId
    });

    if (!ticket) {
      return res.status(404).json({ 
        error: "Ticket not found or you don't have permission to delete it" 
      });
    }

    // Use Promise.all for parallel operations
    await Promise.all([
      // Delete associated connections
      cleanupConnections(ticketId),
      
      // Delete image from Cloudinary if exists
      ticket.imageUrl && (async () => {
        try {
          const publicId = ticket.imageUrl.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.error('Cloudinary deletion error:', error);
        }
      })(),

      // Delete the ticket
      Ticket.findByIdAndDelete(ticketId)
    ]);

    res.json({
      message: "Ticket and associated data deleted successfully",
      ticketId: ticket._id
    });

  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

