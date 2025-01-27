const moment = require('moment');
const crypto = require('crypto');


const extractFields = (ocrText) => {
  const extractedData = {};

  // Improved regex patterns
  const ticketIdRegex = /BOOKING ID:\s*(\w+)/i;
  const eventNameRegex = /(?:Interstellar|(?:Movie|Event Name|Show Name)?\s*[^\n]+)/i;
  const eventDateRegex = /(\w+),\s*(\d{2})\s*(\w+)\s*\|\s*(\d{2}):(\d{2})\s*(AM|PM)/i;
  const seatNumberRegex = /SCREEN \d+\s+([A-Z]{2}-\w+(?:,\w+)+)/i;
  const priceRegex = /Total Amount\s*₹?\s*([\d,]+\.\d+)/i;
  const numberOfTicketsRegex = /(\d+)\s*Ticket\(s\)/i;
  const venueRegex = /INOX:\s*(.+?)\s*£/i;

  // Extract data using the regular expressions
  extractedData.ticketId = ticketIdRegex.exec(ocrText)?.[1] || null;

  const eventNameMatch = eventNameRegex.exec(ocrText);
  extractedData.eventName = eventNameMatch?.[0]?.trim() || null;

  const dateMatch = eventDateRegex.exec(ocrText);
  if (dateMatch) {
    try {
      extractedData.eventDate = moment(
        `${dateMatch[2]}-${dateMatch[3]}-${new Date().getFullYear()} ${dateMatch[4]}:${dateMatch[5]} ${dateMatch[6]}`,
        'DD-MMM-YYYY hh:mm A'
      ).toISOString();
    } catch (error) {
      console.error('Error parsing date:', error);
      extractedData.eventDate = null;
    }
  }

  extractedData.seatNumber = seatNumberRegex.exec(ocrText)?.[1] || null;
  extractedData.price = priceRegex.exec(ocrText)?.[1]?.replace(',', '') || null;
  extractedData.numberOfTickets = numberOfTicketsRegex.exec(ocrText)?.[1] || null;
  extractedData.venue = venueRegex.exec(ocrText)?.[1]?.trim() || null;

  return extractedData;
};





const generateUniqueIdentifier = (ticketId, eventName, venue, seatNumber) => {
  const combinedString = `${ticketId}-${eventName}-${venue}-${seatNumber}`;
  return crypto.createHash('sha256').update(combinedString).digest('hex');
};



// module.exports = { extractFields, generateUniqueIdentifier };
// const moment = require('moment');
// const extractFields = (ocrText) => {
//   const extractedData = {};


//   extractedData.ticketId = ocrText.match(/Booking ID:\s*(\d+)\/(\d+)/i)?.[0] || null; 
//   extractedData.bookingCode = ocrText.match(/Booking code:\s*([A-Z]+)/i)?.[1] || null;
//   extractedData.eventName = ocrText.match(/([A-Z\s]+)\s*:\s*(.*)/i)?.[1] || null;
//   extractedData.eventDate = ocrText.match(/([A-Z]{3},\s*\d{2}\s*[A-Z]{3})/i)?.[1] || null;
//   extractedData.eventTime = ocrText.match(/(\d{2}:\d{2}\s*[AP]M)/i)?.[1] || null;
//   extractedData.seatNumber = ocrText.match(/RESERVED CLASS-([A-Z]\d+)-(\d+)/i)?.[0] || null; 
//   extractedData.price = ocrText.match(/(?:Price|Amount Paid|Total):\s*₹?([\d.]+)/i)?.[1] || null; 
//   extractedData.numberOfTickets = ocrText.match(/(?:Tickets|Number of Tickets):\s*(\d+)/i)?.[1] || null;
//   extractedData.venue = ocrText.match(/([A-Z\s]+Cinemas,.*)/i)?.[1] || null;

//   // Combine eventDate and eventTime
//   extractedData.eventDate = `${extractedData.eventDate} ${extractedData.eventTime}`;
//   if (extractedData.eventDate) {
//     extractedData.eventDate = moment(extractedData.eventDate, 'ddd, DD MMM hh:mm A').toISOString();
//   }

//   return extractedData;
// };

// const generateUniqueIdentifier = (ticketId, eventName, bookingCode, seatNumber) => {
//   const combinedString = `${ticketId}-${eventName}-${bookingCode}-${seatNumber}`; 
//   return crypto.createHash('sha256').update(combinedString).digest('hex');
// };

module.exports = { extractFields, generateUniqueIdentifier };