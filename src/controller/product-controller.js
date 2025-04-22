import productService from '../service/product-service.js';
import { uploadProductImage } from '../utils/upload.js';
import { cloudinary } from '../middleware/cloudinary-middleware.js';

export const addProduct = [
  uploadProductImage,
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new Error('Product image is required');
      }

      const cleanBody = {
        ...req.body,
        expiryDate: req.body.category === 'Aksesoris' 
          ? null 
          : req.body.expiryDate
      };

      if (!['Makanan', 'Minuman', 'Aksesoris'].includes(cleanBody.category)) {
        throw new Error('Invalid category value');
      }

      const result = await productService.addProduct(
        req.user.id,
        req.body,
        req.file
      );

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      if (req.file?.path) {
        await cloudinary.uploader.destroy(req.file.filename); 
      }
      next(error);
    }
  }
];