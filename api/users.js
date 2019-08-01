'use strict';

const db = require('../lib/arangodb');
const aql = require('arangojs').aql;
const router = require('koa-router')();
const jwt = require('jsonwebtoken');
const secretKey = require('config').get('secretKey');
const allowFor = require('../middleware/check-permission');
const User = require('../models/User');

async function login(ctx) {
  let { email, password } = ctx.request.body;
  email = email.toLowerCase();
  const user = await db.query(aql`
    FOR user IN Users
      FILTER user.email==${email}
      RETURN user
  `).then(cursor => cursor.next());
  if (!user) ctx.throw(401, 'Неверный email или пароль');
  const passCheck = await User.checkPassword(password, user.passHash);
  if (!passCheck) return ctx.throw(401, 'Неверный email или пароль');
  if ([1].includes(user.status)) {
    const jwtPayload = {
      _key: user._key,
      _id: user._id,
      name: user.name,
      roles: user.roles
    };
    const authToken = jwt.sign(jwtPayload, secretKey);
    ctx.body = {
      authToken,
      user_key: user._key
    };
  } else {
    ctx.throw(403, 'Пользователь не активен');
  }
}

async function addUser(ctx) {
  let { email, password } = ctx.request.body;
  const user = await db.query(aql`
    FOR user IN Users
      FILTER user.email==${email}
      RETURN user
  `).then(cursor => cursor.next());
  if (user) ctx.throw(400, 'User with this email already exists');
  const userData = {
    email,
    password,
    status: 1, // todo: change to 3 (error when login: findClosestUsers -> FILTER v.user.status == 1)
    createdAt: new Date(),
    createdBy: ctx.state.user._id
  };
  const newUser = await User.create(userData);
  return ctx.body = { _key: newUser._key };
}

async function getUsers(ctx) {
  const users = await db.query(aql`
    FOR user IN Users
      FILTER user.status == 1
      RETURN {_key: user._key, _id: user._id, name: user.name}
  `).then(cursor => cursor.all());
  return ctx.body = { users };
}

router
  .get('/', getUsers)
  .post('/login', login)
  .post('/add', allowFor(['admin']), addUser);

module.exports = router.routes();
