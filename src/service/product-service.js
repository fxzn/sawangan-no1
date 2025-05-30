import { validate } from '../validation/validation.js';
import { addProductValidation, productIdValidation, updateProductValidation } from '../validation/product-validation.js';
import { prismaClient } from '../application/database.js';
import { cloudinary } from '../middleware/cloudinary-middleware.js';
import { ResponseError } from '../error/response-error.js';


const addProduct = async (adminId, request, imageFile) => {
  // Konversi gram ke kilogram
  const weightInKg = parseFloat(request.weight) / 1000;
  
  const validated = validate(addProductValidation, {
    ...request,
    weight: weightInKg, // Simpan dalam kg
    category: request.category.charAt(0).toUpperCase() + 
             request.category.slice(1).toLowerCase(),
  });

  // Validasi weight
  // if (validated.weight <= 0) {
  //   throw new Error(`Weight must be positive: ${request.weight} grams`);
  // }

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
  const products = await prismaClient.product.findMany({
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
      ratingAvg: true,
      createdAt: true,
      addedBy: {
        select: {
          id: true,
          email: true
        }
      },
      Review: {
        select: {
          rating: true
        }
      }
    }
  });

  // Format the response with additional rating info
  return products.map(product => {
    // Hitung ulang ratingAvg jika ada review
    const hasReviews = product.Review.length > 0;
    const accurateRatingAvg = hasReviews 
      ? product.Review.reduce((sum, review) => sum + review.rating, 0) / product.Review.length
      : 0;

    return {
      ...product,
      ratingAvg: accurateRatingAvg,
      // Remove Review array from response
      Review: undefined
    };
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
      ratingAvg:true,
      // reviewCount: true,
      createdAt: true,
      addedBy: {
        select: {
          id: true,
          email: true
        }
      },
      Review: {
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          purchasedPrice: true,
          user: {
            select: {
              id: true,
              fullName: true,
              avatar: true
            }
          }
        }
      }
    }
  });




  if (!product) return null;

  // Hitung review count secara eksplisit
  const reviewCount = await prismaClient.review.count({
    where: { productId: id }
  });

  // Perbaikan: Hitung ulang ratingAvg jika ada review
  let ratingAvg = product.ratingAvg || 0;
  if (reviewCount > 0) {
    const ratingAgg = await prismaClient.review.aggregate({
      where: { productId: id },
      _avg: { rating: true }
    });
    ratingAvg = ratingAgg._avg.rating;
  }

  const ratingDistribution = await prismaClient.review.groupBy({
    by: ['rating'],
    where: { productId: id },
    _count: {
      rating: true
    }
  });

  const distribution = {};
  for (let i = 1; i <= 5; i++) {
    distribution[i] = 0;
  }
  ratingDistribution.forEach(item => {
    distribution[item.rating] = item._count.rating;
  });


  return {

    ...product,
    ratingAvg, 
    reviewCount,
    ratingDistribution: distribution,
    hasReviews: reviewCount > 0,
    isNew: new Date(product.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)


    // ...product,
    // // weightInGrams: product.weight * 1000,
    // ratingAvg: product.ratingAvg || 0,
    // // reviewCount: product.reviewCount || 0,
    // ratingDistribution: distribution,
    // reviewCount,
    // // Add helpful derived fields
    // hasReviews: product.reviewCount > 0,
    // isNew: new Date(product.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Within 30 days
  };
};


const updateProduct = async (productId, request, imageFile) => {
  // Validasi ID produk
  productId = validate(productIdValidation, productId);
  
  // Konversi weight jika ada
  if (request.weight) {
    request.weight = parseFloat(request.weight) / 1000;
  }

  // Validasi request body
  request = validate(updateProductValidation, request);

  // Handle image upload jika ada file baru
  let updateData = { ...request };
  if (imageFile) {
    const uploadResult = await cloudinary.uploader.upload(imageFile.path, {
      folder: 'product_images'
    });
    updateData.imageUrl = uploadResult.secure_url;
  }

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
  return await prismaClient.$transaction(async (prisma) => {
    // 1. Validasi ID produk
    productId = validate(productIdValidation, productId);

    // 2. Cek apakah produk ada
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        imageUrl: true,
        orderItems: {
          select: {
            order: {
              select: {
                status: true
              }
            }
          }
        }
      }
    });

    if (!product) {
      throw new ResponseError(404, "Product not found");
    }

    // 3. Cek apakah ada di order aktif (status bukan COMPLETED/CANCELLED)
    const hasActiveOrders = product.orderItems.some(
      item => !['COMPLETED', 'CANCELLED'].includes(item.order.status)
    );

    if (hasActiveOrders) {
      throw new ResponseError(400, 
        "Cannot delete product - it's in active orders. " +
        "Complete or cancel the orders first."
      );
    }

    // 4. Hapus semua data terkait
    // Tidak perlu hapus OrderItem dan Review secara manual karena sudah ada onDelete: Cascade
    // Tapi kita perlu hapus dari cart items terlebih dahulu
    await prisma.cartItem.deleteMany({
      where: { productId }
    });

    // 5. Hapus produk (akan otomatis hapus OrderItem dan Review terkait)
    const deletedProduct = await prisma.product.delete({
      where: { id: productId }
    });

    // 6. Hapus gambar dari Cloudinary jika ada
    if (deletedProduct.imageUrl) {
      try {
        const publicId = deletedProduct.imageUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`product_images/${publicId}`);
      } catch (error) {
        // console.error('Gagal menghapus gambar dari Cloudinary:', error);
      }
    }

    return {
      id: deletedProduct.id,
      message: "Produk dan semua data terkait berhasil dihapus",
      deleted: true
    };
  });
};




const calculateProductRating = async (productId) => {
  const result = await prismaClient.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: true
  });

  return {
    avgRating: result._avg.rating || 0,
    reviewCount: result._count
  };
};

const updateProductRating = async (productId) => {
  try {
    // Calculate average rating and review count
    const aggregateResult = await prismaClient.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true }
    });

    // Perbaikan: Gunakan nilai rata-rata langsung jika ada review
    const avgRating = aggregateResult._count.rating > 0 
      ? aggregateResult._avg.rating 
      : 0;

    // Update product with new rating data
    return await prismaClient.product.update({
      where: { id: productId },
      data: {
        ratingAvg: avgRating,
        reviewCount: aggregateResult._count.rating || 0
      }
    });
  } catch (error) {
    console.error('Failed to update product rating:', error);
    throw new ResponseError(500, 'Failed to update product rating statistics');
  }
};


const getProductRating = async (productId) => {
  return await prismaClient.product.findUnique({
    where: { id: productId },
    select: {
      ratingAvg: true,
      reviewCount: true
    }
  });
};


export default { 
  addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateProductRating,  
  getProductRating,
  calculateProductRating  
};