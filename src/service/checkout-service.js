import { prismaClient } from '../application/database.js';
import { ResponseError } from '../error/response-error.js';
import rajaongkirService from './komerce-service.js';



  const calculateCartTotals = (items) => {
  return items.reduce((acc, item) => {
    const itemTotal = item.product.price * item.quantity;
    const itemWeight = item.product.weight * item.quantity;
    
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
      const errorDetails = outOfStockItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        requested: item.quantity,
        available: item.product.stock
      }));
      
      throw new ResponseError(400, 'Insufficient stock', { outOfStockItems: errorDetails });
    }
  };


  const processCheckout = async (userId, checkoutData) => {
  return await prismaClient.$transaction(async (prisma) => {
    // Dapatkan cart dengan items
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                weight: true
              }
            }
          }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      throw new ResponseError(400, 'Cart is empty');
    }

    // 2. Calculate cart totals and validate stock
    const { subTotal, totalWeight, itemsWithPrice } = calculateCartTotals(cart.items);
    validateStockAvailability(cart.items);

    // 3. Get shipping options
    const shippingOptions = await rajaongkirService.getShippingCost(
    process.env.WAREHOUSE_LOCATION_ID,
    checkoutData.destinationId,
    totalWeight,
    subTotal,
    checkoutData.paymentMethod === 'COD'
    );
    

    // 4. Validate selected shipping service
    const selectedService = shippingOptions.find(
      service => service.service_code === checkoutData.shippingService
    );

    if (!selectedService) {
      throw new ResponseError(400, 'Selected shipping service not available', { availableServices: shippingOptions });
    }

    // 5. Update product stocks
    await Promise.all(
      cart.items.map(item => 
        prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        })
      )
    );

    // 6. Create order
    const order = await prisma.order.create({
      data: {
        userId,
        subTotal,
        shippingCost: selectedService.price,
        totalAmount: subTotal + selectedService.price,
        status: 'PENDING',
        shippingAddress: checkoutData.shippingAddress,
        destinationId: checkoutData.destinationId,
        courier: selectedService.courier_name,
        shippingService: selectedService.service_name,
        estimatedDelivery: selectedService.etd,
        paymentMethod: checkoutData.paymentMethod,
        items: { create: itemsWithPrice }
      },
      include: { items: true }
    });


    // 7. Clear cart
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return order;


  });
};

export default {
    processCheckout 
};