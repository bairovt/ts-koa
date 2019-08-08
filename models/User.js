'use strict';
const db = require('../lib/arangodb');
const crypto = require('crypto');
const Joi = require('joi');

class User {
  constructor(user) {
    this._key = user._key;
    this._id = user._id;
    this.name = user.name;
    this.roles = user.roles || []; // 'admin', 'manager', 'inviter'
    this.status = user.status;
  }

  static get schema() {
    return Joi.object().keys({
      name: Joi.string().trim().min(1).max(100).required(),
      email: Joi.string().trim().email().required(),
      // password: Joi.string().regex(/^[a-zA-Z0-9`~!@#$%^&\*()_=+/{}[\];:'"\\|,.<>-]|\?{3,30}$/).required(),
      status: Joi.number().integer().min(0).max(5).required(),
      invitedAt: Joi.date().allow(null),
      invitedBy: Joi.string().allow(null)
    });
  }

  static async create(userData) {
    // todo: доделать валидацию
    const validUser = Joi.attempt(userData, User.schema);
    validUser.email = validUser.email.toLowerCase();
    validUser.status = validUser.status || 1;
    validUser.passHash = await User.hashPassword(validUser.password);
    validUser.password = undefined;
    const usersCollection = db.collection('Users');
    return await usersCollection.save(validUser);
  }

  static async get(_key) {
    const usersCollection = db.collection('Users');
    const user = await usersCollection.document(_key);
    return new User(user);
  }

  static hashPassword(password, salt) { //promise
    if (!salt) salt = crypto.randomBytes(32).toString("base64"); //при проверке пароля указываем salt
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 10000, 32, 'sha256', function (err, hash) {
        if (err) {
          return reject(err);
        }
        return resolve(salt + '.' + hash.toString("base64"));
      })
    })
  }

  static checkPassword(password, passHash) { //promise
    const [salt, hash] = passHash.split('.');
    return User.hashPassword(password, salt)
      .then(newPassHash => {
        return newPassHash === passHash;
      });
  }

  isAdmin() {
    /* Checks if user is admin */
    return this.roles.includes('admin');
  }

  hasRoles(allowedRoles) { // array
    if (this.roles.includes('admin')) return true; // admin has all roles
    /* Check if user has one of the allowed roles */
    return this.roles.some(role => allowedRoles.includes(role)); // true or false
  }

  hasRole(role) { // string
    if (this.roles.includes('admin')) return true;
    /* Check if user has a role */
    return this.roles.includes(role); // true or false
  }
}

module.exports = User;
