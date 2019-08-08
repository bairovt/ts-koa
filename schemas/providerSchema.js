const Joi = require('joi');

module.exports = Joi.object().keys({
  name: Joi.string().trim().min(2).max(100).required(),
  tel: Joi.string().trim().min(5).max(20).empty('').required(),
  place: Joi.string().trim().min(1).max(255).empty('').allow(null),
  comment: Joi.string().trim().min(1).max(3000).empty('').allow(null),
  // createdBy: Joi.string().trim().regex(/^[a-zA-Z0-9]+$/).min(3).max(30).allow(null),
});