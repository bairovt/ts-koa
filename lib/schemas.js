const Joi = require('joi');

const arangoIdSchema = Joi.string().trim().regex(/^[a-zA-Z0-9]+\/[a-zA-Z0-9]+$/).min(3).max(50).allow(null);

const orderSchema = Joi.object().keys({
  date: Joi.date().iso().required(),
  meat: Joi.string().valid("BEEF", "PORK", "MUTTON", "HORSE").required(),
  kg: Joi.number().required(),
  comment: Joi.string().trim().min(1).max(3000).empty('').allow(null),
  provider: arangoIdSchema,
  status: Joi.string().valid("CREATED", "DELIVERED", "FAILED")
});

const providerSchema = Joi.object().keys({
  name: Joi.string().trim().min(2).max(100).required(),
  tel: Joi.string().trim().min(5).max(20).empty('').required(),
  place: Joi.string().trim().min(1).max(255).empty('').allow(null),
  comment: Joi.string().trim().min(1).max(3000).empty('').allow(null),
});

module.exports = { providerSchema, orderSchema }