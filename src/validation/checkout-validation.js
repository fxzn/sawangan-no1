import Joi from 'joi';


export const checkoutValidation = Joi.object({
  shippingAddress: Joi.string().required().min(10).max(255),
  shippingCity: Joi.string().required(),
  shippingProvince: Joi.string().required(),
  shippingPostCode: Joi.string().required().pattern(/^\d+$/),
  destinationId: Joi.string().required().pattern(/^\d+$/),
  // courier: Joi.string().valid('NINJA', 'SAP', 'JNT').required(),  
  shippingService: Joi.string().required(),
  courier: Joi.string().required(),
  // paymentMethod: Joi.string().valid('CREDIT_CARD', 'PAYPAL', 'BANK_TRANSFER', 'COD').required(),
  paymentMethod: Joi.string()
  .valid(
    'CREDIT_CARD',
    'BANK_TRANSFER', 
    'MANDIRI_BILL',
    'QRIS',
    'COD'
  )
  .required()
  .messages({
    'any.only': 'Payment method must be one of: CREDIT_CARD, BANK_TRANSFER, MANDIRI_BILL, QRIS, COD',
    'string.empty': 'Payment method is required'
  }),
  notes: Joi.string().max(500).optional()
}).options({ abortEarly: false });

  