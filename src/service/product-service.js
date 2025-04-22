import { validate } from '../validation/validation.js';
import { addProductValidation } from '../validation/product-validation.js';
import { prismaClient } from '../application/database.js';
import { cloudinary } from '../middleware/cloudinary-middleware.js';

const addProduct = async (adminId, request, imageFile) => {
  const validated = validate(addProductValidation, {
    ...request,
    category: request.category.charAt(0).toUpperCase() + request.category.slice(1).toLowerCase(),
    price: parseFloat(request.price),
    weight: parseFloat(request.weight),
    stock: parseInt(request.stock),
    expiryDate: request.expiryDate || null
  });

  const uploadResult = await cloudinary.uploader.upload(imageFile.path, {
    folder: 'product_images',
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }]
  });

  return await prismaClient.product.create({
    data: {
      name: validated.name,
      price: validated.price,
      description: validated.description,
      imageUrl: uploadResult.secure_url,
      category: validated.category,
      weight: validated.weight,
      stock: validated.stock,
      expiryDate: validated.expiryDate,
      addedById: adminId
    },
    select: {
      id: true,
      name: true,
      price: true,
      description: true,
      imageUrl: true,
      category: true,
      weight: true,
      stock: true,
      expiryDate: true,
      createdAt: true
    }
  });
};

export default { addProduct };