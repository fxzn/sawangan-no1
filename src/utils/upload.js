import multer from 'multer';
import { productStorage } from '../middleware/cloudinary-middleware.js';

const upload = multer({ 
  storage: productStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    console.log('Uploading file with mimetype:', file.mimetype);
    if (['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only jpeg/jpg/png files are allowed'), false);
    }
  }
});

export const uploadProductImage = upload.single('image');