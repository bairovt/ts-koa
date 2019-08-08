'use strict';
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const secretKey = require('config').get('secretKey');
const _ = require('lodash');

/* authentication middleware */
module.exports = async function (ctx, next) {
  if (['/api/users/login'].includes(ctx.request.url)) {
    return await next();
  }
  const authHeader = ctx.request.header.authorization;
  if (!authHeader) return ctx.throw(401, 'Empty authorization header');

  const authToken = authHeader.split(' ').pop();
  const jwtPayload = jwt.verify(authToken, secretKey); // may throw JsonWebTokenError,

  const user = await User.get(jwtPayload._key);
  if (!user ||
    user.status !== 1 ||
    !_.isEqual(_.sortBy(user.roles), _.sortBy(jwtPayload.roles))
  ) ctx.throw(401, 'Jwt payload is not valid');

  ctx.state.user = user;
  return await next()
};
