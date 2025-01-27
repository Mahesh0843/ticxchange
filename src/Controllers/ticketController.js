const moment = require('moment');
const Ticket = require('../models/Ticket');
const { performOCR } = require('../utils/ocrUtils');
const { uploadToCloudinary } = require('../utils/cloudinaryUtils'); // Replace Firebase with Cloudinary
const { extractFields, generateUniqueIdentifier } = require('../utils/validationUtils');
const fetch = require('node-fetch'); // Ensure fetch is available in Node.js
require('dotenv').config({ path: './src/.env' });




exports.createManualTicket = async (req, res) => {
  try {
    const { ticketId, eventName, eventDate, seatNumber, price, numberOfTickets, venue } = req.body;

    if (!ticketId || !eventName || !eventDate || !seatNumber || !price || !numberOfTickets || !venue) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const uniqueIdentifier = generateUniqueIdentifier(ticketId, eventName, venue, seatNumber);

    const existingTicket = await Ticket.findOne({ uniqueIdentifier });
    if (existingTicket) {
      return res.status(400).json({ error: 'Duplicate ticket detected.' });
    }

    const newTicket = new Ticket({
      ticketId,
      eventName,
      eventDate,
      seatNumber,
      price,
      numberOfTickets,
      venue,
      uniqueIdentifier,
      sellerId: req.user._id,
      isAvailable: true,
    });

    await newTicket.save();

    res.status(201).json({ message: 'Ticket created successfully', ticket: newTicket });
  } catch (error) {
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

    // Validate event date
    const currentDateTime = moment().toISOString();
    if (moment(extractedFields.eventDate).isBefore(currentDateTime)) {
      return res.status(400).json({ message: 'The ticket date has already passed.' });
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


exports.createUpdateLocation = async (req, res) => {
  const { coordinates } = req.body;

  if (!coordinates || coordinates.length !== 2) {
    return res.status(400).json({ error: 'Invalid coordinates provided' });
  }

  const [latitude, longitude] = coordinates;

  try {
    // Fetch city from OpenWeatherMap API
    const openWeatherUrl = `http://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}`;
    const response = await fetch(openWeatherUrl);
    const result = await response.json();

    if (!result || !Array.isArray(result) || result.length === 0 || !result[0].name) {
      return res
        .status(400)
        .json({ error: 'Unable to determine city from the provided coordinates' });
    }

    const city = result[0].name;

    // Update ticket location and city
    const ticket = await Ticket.findByIdAndUpdate(
      req.ticket._id, // Use the ticket ID from middleware
      { location: { type: 'Point', coordinates }, city },
      { new: true }
    );

    res.status(200).json({
      message: 'Location and city updated successfully',
      ticket,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error while updating location' });
  }
};
