const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const CLOUDINARY_ENABLED = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

// Uploads a buffer (from multer memoryStorage) straight to Cloudinary — no local
// disk write, so images survive redeploys/restarts on hosts with ephemeral disk
// (this was the root cause of banners/events/profile photos "disappearing").
function uploadBufferToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `kritiva/${folder}`, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

function deleteFromCloudinary(publicId) {
  if (!publicId) return Promise.resolve();
  return cloudinary.uploader.destroy(publicId).catch(err => {
    console.error('CLOUDINARY DELETE ERROR:', err.message);
  });
}

// Use memory storage everywhere images go to Cloudinary — multer just hands us
// req.file.buffer, we push it up ourselves in the route.
const memoryUpload = (maxSizeMB = 5) => multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxSizeMB * 1024 * 1024 }
});

module.exports = { cloudinary, uploadBufferToCloudinary, deleteFromCloudinary, memoryUpload, CLOUDINARY_ENABLED };
