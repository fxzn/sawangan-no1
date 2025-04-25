// import orderService from '../service/order-service.js';
import checkoutService from '../service/checkout-service.js';
import komerceService from '../service/komerce-service.js';

import { checkoutValidation } from '../validation/checkout-validation.js';
import { validate } from '../validation/validation.js';

export const checkout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const request = validate(checkoutValidation, req.body);
    
    // const order = await orderService.processCheckout(userId, request);
    const order = await checkoutService.processCheckout(userId, request);
    
    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};


export const getShippingOptions = async (req, res, next) => {
    try {
      const { destinationId, weight, itemValue = 0, cod = false } = req.query;
      
      const options = await komerceService.getShippingCost(
        process.env.WAREHOUSE_LOCATION_ID,
        destinationId,
        Number(weight),
        Number(itemValue),
        cod === 'true'
        
        // originCityId,
        // cityId,
        // weight,
        // ['jne', 'tiki', 'pos'] // Semua kurir
      );
      
      res.json({
        success: true,
        data: options
      });
    } catch (error) {
      next(error);
    }
  };



  // controller/checkout-controller.js
// export const searchDestinations = async (req, res, next) => {
//   try {
//     const { keyword } = req.query;

//     if (!keyword) {
//       throw new ResponseError(400, 'Keyword parameter is required');
//     }

//     const results = await komerceService.searchDestinations(keyword);

//     res.json({
//       success: true,
//       data: results,
//       meta: {
//         searchedKeyword: keyword,
//         resultCount: results.length
//       }
//     });

//   } catch (error) {
//     // Log error detail untuk debugging
//     console.error('Search Destination Controller Error:', {
//       query: req.query,
//       error: error.stack
//     });
    

//      // Format error response sesuai dokumentasi Komerce
//     if (error.response?.data) {
//       return res.status(error.status || 500).json({
//         success: false,
//         error: {
//           code: error.response.data.code || 'API_ERROR',
//           message: error.response.data.message,
//           details: error.response.data.errors
//         }
//       });
//     }


//     next(error);
//   }
// };


export const searchDestinations = async (req, res, next) => {
  try {
    const { keyword } = req.query;

    // Validasi lebih ketat
    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Keyword must be a string'
        }
      });
    }

    const results = await komerceService.searchDestinations(keyword);

    // Response format konsisten
    return res.json({
      success: true,
      data: results,
      meta: {
        searchedKeyword: keyword,
        resultCount: results.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    // Error handling lebih terstruktur
    const statusCode = error.status || 500;
    const errorResponse = {
      success: false,
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message,
        ...(error.details && { details: error.details })
      }
    };

    console.error(`[${new Date().toISOString()}] Destination Search Error:`, {
      query: req.query,
      statusCode,
      error: error.stack
    });

    return res.status(statusCode).json(errorResponse);
  }
};


