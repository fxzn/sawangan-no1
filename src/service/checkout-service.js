import { prismaClient } from '../application/database.js';
import { ResponseError } from '../error/response-error.js';
import komerceService from './komerce-service.js';

const calculateCartTotals = (items) => {
  return items.reduce((acc, item) => {
    const itemTotal = item.product.price * item.quantity;
    const itemWeight = item.product.weight * item.quantity; // weight sudah dalam kg

    
    return {
      subTotal: acc.subTotal + itemTotal,
      totalWeight: acc.totalWeight + itemWeight,
      itemsWithPrice: [
        ...acc.itemsWithPrice,
        {
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price
        }
      ]
    };
  }, { subTotal: 0, totalWeight: 0, itemsWithPrice: [] });
};

const validateStockAvailability = (items) => {
  const outOfStockItems = items.filter(item => item.product.stock < item.quantity);
  
  if (outOfStockItems.length > 0) {
    throw new ResponseError(400, 'Insufficient stock', {
      outOfStockItems: outOfStockItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        requested: item.quantity,
        available: item.product.stock
      }))
    });
  }
};

const processCheckout = async (userId, checkoutData) => {
  return await prismaClient.$transaction(async (prisma) => {
    // Get cart with items
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      throw new ResponseError(400, 'Cart is empty');
    }


    // 2. Dapatkan data user untuk informasi customer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        email: true,
        phone: true
      }
    });

    if (!user) {
      throw new ResponseError(404, 'User not found');
    }


// 3. Calculate cart totals and validate stock
    // const { subTotal, totalWeight, itemsWithPrice } = calculateCartTotals(cart.items);
    // validateStockAvailability(cart.items);

    const { subTotal, totalWeight, itemsWithPrice } = calculateCartTotals(cart.items);


// 4. Get shipping options
    const shippingOptions = await komerceService.calculateShippingCost({
      shipper_destination_id: process.env.WAREHOUSE_LOCATION_ID,
      receiver_destination_id: checkoutData.destinationId,
      weight: totalWeight,
      item_value: subTotal,
      cod: checkoutData.paymentMethod === 'COD'
    });

    // Validate selected shipping service
    console.log('Available shipping options:', JSON.stringify(shippingOptions, null, 2));
    console.log('Requested service:', {
      courier: checkoutData.courier,
      service: checkoutData.shippingService
    });



    // 5. Validate selected shipping service
    // const selectedService = shippingOptions.find(service => {
    //   const normalize = (str) => str ? str.toString().trim().toLowerCase() : '';


    //   console.log('Comparing:', {
    //     available: `${availableCourier} - ${availableService}`,
    //     requested: `${requestedCourier} - ${requestedService}`
    //   });
    //   return (
    //     normalize(service.shipping_name) === normalize(checkoutData.courier) && 
    //     normalize(service.service_name) === normalize(checkoutData.shippingService)
    //   );
    // });

    const selectedService = shippingOptions.find(service => {
      const normalize = (str) => str ? str.toString().trim().toLowerCase() : '';
      
      const availableCourier = normalize(service.shipping_name);
      const availableService = normalize(service.service_name);
      const requestedCourier = normalize(checkoutData.courier);
      const requestedService = normalize(checkoutData.shippingService);
    
      console.log('Comparing:', {
        available: `${availableCourier} - ${availableService}`,
        requested: `${requestedCourier} - ${requestedService}`
      });
    
      return availableCourier === requestedCourier && 
             availableService === requestedService;
    });

    // if (!selectedService) {
    //   console.error('Shipping service validation failed. Details:', {
    //     requested: {
    //       courier: checkoutData.courier,
    //       service: checkoutData.shippingService
    //     },
    //     availableOptions: shippingOptions.map(opt => ({
    //       courier: opt.shipping_name,
    //       service: opt.service_name,
    //       price: opt.price,
    //       etd: opt.etd
    //     }))
    //   });

    //   throw new ResponseError(400, 'Selected shipping service not available', {
    //     availableServices: shippingOptions,
    //     requestedService: {
    //       courier: checkoutData.courier,
    //       service: checkoutData.shippingService
    //     }
    //   });
    // }

    if (!selectedService) {
      throw new ResponseError(400, 'Selected shipping service not available', {
        availableServices: shippingOptions
      });
    }


 // 6. Update product stocks
    await Promise.all(
      cart.items.map(item => 
        prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        })
      )
    );

// 7. Create order dengan semua field wajib
    const order = await prisma.order.create({
      data: {
        userId,
        items: {
          create: itemsWithPrice
        },
        status: 'PENDING',
        totalAmount: subTotal + selectedService.price,
        customerName: user.fullName || 'Customer', // Wajib diisi
        customerEmail: user.email, // Wajib diisi
        customerPhone: user.phone || '', // Wajib diisi, berikan default value jika null
        shippingAddress: checkoutData.shippingAddress,
        shippingCity: checkoutData.shippingCity,
        shippingProvince: checkoutData.shippingProvince,
        shippingPostCode: checkoutData.shippingPostCode,
        shippingCost: selectedService.price,
        shipping_name: selectedService.shipping_name,
        service_name: selectedService.service_name,
        paymentMethod: checkoutData.paymentMethod,
        estimatedDelivery: selectedService.etd || '1-3 days' // Berikan default value jika kosong
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true
              }
            }
          }
        }
      }
    });

// 8. Clear cart
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return order;
  });
};

export default {
  processCheckout 
};