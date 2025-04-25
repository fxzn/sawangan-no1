import productService from '../service/product-service.js';
import { uploadProductImage } from '../utils/upload.js';
import { cloudinary } from '../middleware/cloudinary-middleware.js';
import { ResponseError } from '../error/response-error.js';
import { validate } from '../validation/validation.js';
import { productIdValidation, updateProductValidation } from '../validation/product-validation.js';

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

export const getAllProducts = async (req, res, next) => {
  try {
    const products = await productService.getAllProducts(req.body);
    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    next(error);
  }
};


export const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      throw new ResponseError(404, "Product not found");
    }
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};



export const updateProduct = async (req, res, next) => {
  try {
    const productId = validate(productIdValidation, req.params.id);
    const request = validate(updateProductValidation, req.body);

    if (req.body.imageUrl) {
      throw new ResponseError(400, "Use image upload to change product image");
    }

    const result = await productService.updateProduct(
      productId,
      request,
      req.file
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    if (req.file?.path) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    next(error);
  }
};




export const deleteProduct = async (req, res, next) => {
  try {
    const productId = validate(productIdValidation, req.params.id);
    await productService.deleteProduct(productId);
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};