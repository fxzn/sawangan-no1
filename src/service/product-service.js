import { validate } from '../validation/validation.js';
import { addProductValidation, productIdValidation, updateProductValidation } from '../validation/product-validation.js';
import { prismaClient } from '../application/database.js';
import { cloudinary } from '../middleware/cloudinary-middleware.js';


const addProduct = async (adminId, request, imageFile) => {
  // Konversi gram ke kilogram
  const weightInKg = parseFloat(request.weight) / 1000;
  
  const validated = validate(addProductValidation, {
    ...request,
    weight: weightInKg, // Simpan dalam kg
    category: request.category.charAt(0).toUpperCase() + 
             request.category.slice(1).toLowerCase(),
    expiryDate: request.category === 'Aksesoris' ? null : request.expiryDate
  });

  // Validasi weight
  if (validated.weight <= 0) {
    throw new Error(`Weight must be positive: ${request.weight} grams`);
  }

  const uploadResult = await cloudinary.uploader.upload(imageFile.path, {
    folder: 'product_images'
  });

  return await prismaClient.product.create({
    data: {
      ...validated,
      imageUrl: uploadResult.secure_url,
      addedById: adminId
    },
    select: {
      id: true,
      name: true,
      price: true,
      description: true,
      imageUrl: true,
      category: true,
      weight: true, // Dalam kg
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
  const product = await prismaClient.product.findUnique({
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

  if (!product) return null;

  return {
    ...product,
    weightInGrams: product.weight * 1000, // Tambahkan konversi ke gram
    weight: product.weight // Nilai asli dalam kg
  };
};



const updateProduct = async (productId, request, imageFile) => {
  productId = validate(productIdValidation, productId);
  
  // Jika ada weight, konversi gram ke kg
  if (request.weight) {
    request.weight = parseFloat(request.weight) / 1000;
  }

  request = validate(updateProductValidation, request);

  // Handle validasi khusus
  if (request.category === 'Aksesoris' && request.expiryDate) {
    throw new ResponseError(400, "Aksesoris products cannot have expiryDate");
  }



  return await prismaClient.product.update({
    where: { id: productId },
    data: request,
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