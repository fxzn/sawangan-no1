import { validate } from '../validation/validation.js';
import { addProductValidation, productIdValidation, updateProductValidation } from '../validation/product-validation.js';
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


const getAllProducts = async () => {
  return await prismaClient.product.findMany({
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
      createdAt: true,
      addedBy: {
        select: {
          id: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};


const getProductById = async (id) => {
  return await prismaClient.product.findUnique({
    where: { id },
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
      createdAt: true,
      addedBy: {
        select: {
          id: true,
          email: true
        }
      }
    }
  });
};




const updateProduct = async (productId, request, imageFile) => {
  // Validasi input
  productId = validate(productIdValidation, productId);
  request = validate(updateProductValidation, request);

  // Handle validasi khusus
  if (request.category === 'Aksesoris' && request.expiryDate) {
    throw new ResponseError(400, "Aksesoris products cannot have expiryDate");
  }

  // Handle image upload
  let updateData = { ...request };
  
  if (imageFile) {
    const uploadResult = await cloudinary.uploader.upload(imageFile.path, {
      folder: 'product_images'
    });
    updateData.imageUrl = uploadResult.secure_url;

    // Delete old image
    const oldProduct = await prismaClient.product.findUnique({
      where: { id: productId }
    });
    if (oldProduct?.imageUrl) {
      const publicId = oldProduct.imageUrl.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`product_images/${publicId}`);
    }
  }

  // Konversi tipe data
  if (updateData.price) updateData.price = parseFloat(updateData.price);
  if (updateData.weight) updateData.weight = parseFloat(updateData.weight);
  if (updateData.stock) updateData.stock = parseInt(updateData.stock);
  if (updateData.expiryDate) updateData.expiryDate = new Date(updateData.expiryDate);

  // Update product
  return await prismaClient.product.update({
    where: { id: productId },
    data: updateData,
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
      createdAt: true,
      addedBy: {
        select: {
          id: true,
          email: true
        }
      }
    }
  });
};



const deleteProduct = async (productId) => {
  // Validasi ID
  productId = validate(productIdValidation, productId);

  // Cari produk untuk mendapatkan URL gambar
  const product = await prismaClient.product.findUnique({
    where: { id: productId },
    select: { imageUrl: true }
  });

  if (!product) {
    throw new ResponseError(404, "Product not found");
  }

  // Hapus produk
  await prismaClient.product.delete({
    where: { id: productId }
  });

  // Hapus gambar dari Cloudinary
  if (product.imageUrl) {
    const publicId = product.imageUrl.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(`product_images/${publicId}`);
  }

  return {
    id: productId,
    message: "Product deleted successfully"
  };
};





export default { 
  addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct
};