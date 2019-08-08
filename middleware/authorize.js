'use strict';

/* Authorization middleware
 check if a user's role is allowed (roles)
*/
module.exports = function (allowedRoles) { // array
  return async function (ctx, next) {
    let allowed = false;
    const user = ctx.state.user;

    if (user.isAdmin()) allowed = true;
    else allowed = user.hasRoles(allowedRoles);

    if (allowed) return next();
    else {
      return ctx.throw(403, 'Forbidden for this user');
    }
  }
};
