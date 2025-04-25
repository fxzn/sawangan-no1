import Joi from 'joi';



export const checkoutValidation = Joi.object({
  shippingAddress: Joi.string().required().min(10).max(255),
  destinationId: Joi.string().required().pattern(/^\d+$/),
  shippingService: Joi.string().required(),
  paymentMethod: Joi.string()
    .valid('CREDIT_CARD', 'PAYPAL', 'BANK_TRANSFER', 'COD')
    .required(),
  notes: Joi.string().max(500).optional()
}).options({ abortEarly: false });