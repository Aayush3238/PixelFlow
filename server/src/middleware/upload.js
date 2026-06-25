import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/tiff',
    'image/gif',
  ];
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only image files are allowed.'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 20,
  },
});

export default upload;
