import Joi from 'joi';

export const addProductValidation = Joi.object({
  name: Joi.string().max(100).required(),
  price: Joi.number().positive().required(),
  description: Joi.string().required(),
  category: Joi.string().valid("Makanan", "Minuman", "Aksesoris").required(),
  // category: Joi.string().valid("Makanan", "Minuman", "Aksesoris").required(),
  weight: Joi.number().positive().required(),
  stock: Joi.number().integer().min(0).required(),
  expiryDate: Joi.date().min('now').optional()
    .when('category', {
      is: Joi.string().valid("Makanan", "Minuman"),
      then: Joi.required(),
      otherwise: Joi.optional().allow(null, '')
      // otherwise: Joi.optional()
    })
});