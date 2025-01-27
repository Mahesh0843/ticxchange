// const Tesseract = require('tesseract.js');
// const fs = require('fs');

// const performOCR = async (imagePath) => {
//   if (!fs.existsSync(imagePath)) {
//     console.error('File does not exist:', imagePath);
//     throw new Error('OCR error: File not found');
//   }

//   try {
//     const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
//       logger: (info) => console.log(info), // Log OCR progress
//     });
//     console.log(text.replace(/\s+/g, ' ').trim());
//     return text.replace(/\s+/g, ' ').trim();
//   } catch (err) {
//     console.error('OCR error:', err);
//     throw new Error('Failed to extract text using OCR.');
//   }
// };

// module.exports = { performOCR };


const Tesseract = require('tesseract.js');
const fs = require('fs');

const performOCR = async (imagePath) => {
  if (!fs.existsSync(imagePath)) {
    console.error('File does not exist:', imagePath);
    throw new Error('OCR error: File not found');
  }

  try {
    // Set appropriate language for better accuracy
    const lang = 'eng+hin'; // Use 'eng+hin' for English and Hindi text

    // Customize options for improved OCR
    const options = {
      logger: (info) => console.log(info), // Log OCR progress
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-:.,|%₹' 
      // Define allowed characters to improve accuracy and speed
    };

    const { data: { text } } = await Tesseract.recognize(imagePath, lang, options);

    // Clean up text for better data extraction
    const cleanedText = text.replace(/\s+/g, ' ').trim(); 
    console.log(cleanedText);
    return cleanedText;
  } catch (err) {
    console.error('OCR error:', err);
    throw new Error('Failed to extract text using OCR.');
  }
};

module.exports = { performOCR };