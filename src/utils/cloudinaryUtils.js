const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadToCloudinary = async (filePath, ticketId) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'tickets',
      public_id: `ticket_${ticketId}`,
      resource_type: 'image',
    });

    return result.secure_url; // Return the Cloudinary URL
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};
