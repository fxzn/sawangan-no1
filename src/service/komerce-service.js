import axios from 'axios';
import { ResponseError } from '../error/response-error.js';


class KomerceService {
  constructor() {
    this.apiKey = process.env.KOMERCE_API_KEY_SHIPPING_DELIVERY;
    this.baseUrl = process.env.KOMERCE_API_URL;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: { 
        'x-api-key': this.apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 8000 
    });
  }

  async searchDestinations(keyword) {
    try {
      // Perbaikan 1: keyword.trim() bukan keyword.trim
      if (!keyword || keyword.trim().length < 3) {
        throw new ResponseError(400, 'Keyword must be at least 3 characters');
      }
  
      // Perbaikan 2: Tambahkan debug logging
      console.log('Requesting Komerce API with params:', {
        keyword: keyword.trim(),
        apiKey: this.apiKey ? 'exists' : 'missing'
      });
  
      const response = await this.axiosInstance.get('/tariff/api/v1/destination/search', {
        params: { 
          keyword: keyword.trim() 
        }
      });
  
      // Perbaikan 3: Validasi response lebih ketat
      if (!response.data) {
        throw new ResponseError(500, 'Empty response from Komerce API');
      }
  
      if (response.data.success === false) {
        throw new ResponseError(
          response.data.code || 400,
          response.data.message || 'API request failed',
          { apiResponse: response.data }
        );
      }
  
      // Perbaikan 4: Pastikan data ada
      if (!response.data.data) {
        throw new ResponseError(404, 'No destination data found');
      }
  
      return response.data.data;
    } catch (error) {
      // Perbaikan 5: Error logging lebih detail
      console.error('KOMERCE API ERROR DETAILS:', {
        errorMessage: error.message,
        stack: error.stack,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        requestConfig: {
          url: error.config?.url,
          headers: error.config?.headers
        }
      });
  
      throw new ResponseError(
        error.response?.status || 500,
        `Failed to search destinations: ${error.response?.data?.message || error.message}`,
        {
          apiError: error.response?.data,
          internalDetails: error.message
        }
      );
    }
  }

  // async searchDestinations(keyword) {
  //   try {
  //     // Validasi minimal 3 karakter
  //     if (!keyword || keyword.trim().length < 3) {
  //       throw new ResponseError(400, 'Keyword must be at least 3 characters');
  //     }

  //     // Perbaikan 2: Tambahkan debug logging
  //   console.log('Requesting Komerce API with params:', {
  //     keyword: keyword.trim(),
  //     apiKey: this.apiKey ? 'exists' : 'missing'
  //   });

  //     const response = await this.axiosInstance.get('/tariff/api/v1/destination/search', {
  //       params: { 
  //         keyword: keyword.trim() 
  //       }
  //     });

  //     if (response.data && !response.data.success) {
  //       throw new ResponseError(
  //         response.data.code || 400,
  //         response.data.message || 'API request failed'
  //       );
  //     }

  //     return response.data.data;


  //           // }));
  //         } catch (error) {
  //           console.error('[KOMERCE API ERROR]', {
  //             endpoint: 'searchDestinations',
  //             status: error.response?.status,
  //             data: error.response?.data,
  //             config: error.config
  //           });
  //           throw new ResponseError(
  //             error.response?.status || 500,
  //               `Komerce API error: ${error.response?.data?.message || error.message}`
  //           );
  //         }
  //       }
      
      


  async getShippingCost(originId, destinationId, weight, itemValue = 0, cod = false) {
    try {
      const response = await this.axiosInstance.get('/tariff/api/v1/calculate', {
        params: {
          shipper_destination_id: originId,
          receiver_destination_id: destinationId,
          weight,
          item_value: itemValue,
          cod: cod ? 'yes' : 'no'
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to calculate shipping');
      }

      return response.data.data;
    } catch (error) {
      console.error('Komerce API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw new ResponseError(
        error.response?.status || 500,
        error.response?.data?.message || 'Shipping service unavailable'
      );
    }
  }



}

export default new KomerceService();