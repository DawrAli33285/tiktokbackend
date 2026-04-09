const multer=require('multer')
const path=require('path')
const fs=require('fs')

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp/public/files/images');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp/public/files/videos');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const imageFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp|jfif/;
  const allowedMimeTypes = /image\/(jpeg|png|webp|jpg)/;
  const extValid = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedMimeTypes.test(file.mimetype);
  if (extValid && mimeValid) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpg, jpeg, jfif, png, webp)'));
  }
};

const videoFilter = (req, file, cb) => {
  const allowedExtensions = /mp4|mov|avi|webm|mkv/;
  const allowedMimeTypes = /video\/(mp4|quicktime|x-msvideo|webm|x-matroska)/;
  const extValid = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedMimeTypes.test(file.mimetype);
  if (extValid && mimeValid) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed (mp4, mov, avi, webm, mkv)'));
  }
};

const uploadImage = multer({ storage: imageStorage, fileFilter: imageFilter });
const uploadVideo = multer({ storage: videoStorage, fileFilter: videoFilter, limits: { fileSize: 200 * 1024 * 1024 } }); 

module.exports = { uploadImage, uploadVideo };