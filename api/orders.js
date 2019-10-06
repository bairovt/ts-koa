'use strict';
const db = require('../lib/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');
const Joi = require('joi');
const _ = require('lodash');

const router = new Router();

// const orderSchema = Joi.object().keys({
//   name: Joi.string().trim().min(2).max(100).required(),
//   tel: Joi.string().trim().min(5).max(20).empty('').required(),
//   place: Joi.string().trim().min(1).max(255).empty('').allow(null),
//   comment: Joi.string().trim().min(1).max(3000).empty('').allow(null),
//   // createdBy: Joi.string().trim().regex(/^[a-zA-Z0-9]+$/).min(3).max(30).allow(null),
// });

async function filterOrders(ctx, next) {
  const filter = {
    status: ctx.query.status || '',
    meat: ctx.query.meat || ''
  };
  let orders = await db.query(aql`FOR order IN Orders
  FILTER order.status == ${filter.status}
  FILTER ${!!filter.meat} ? order.meat == ${filter.meat} : true
  SORT order.date ASC
  RETURN order`).then(cursor => cursor.all());
  ctx.body = {
    orders
  };
}

async function getOrder(ctx, next) {
  const {
    _key
  } = ctx.params;
  const ordersCollection = db.collection('Orders');
  const order = await ordersCollection.document(_key);
  ctx.body = {
    order
  };
}

async function createOrder(ctx) {
  const ordersCollection = db.collection('Orders');
  const {
    orderData
  } = ctx.request.body;
  // const validOrder = Joi.attempt(orderData, orderSchema);
  const validOrder = orderData;
  validOrder.createdBy = ctx.state.user._id;
  validOrder.createdAt = new Date();
  validOrder.status = 'CREATED';
  const result = await ordersCollection.save(validOrder, {
    returnNew: true
  });
  return ctx.body = {
    newOrder: result.new
  };
}

async function deleteOrder(ctx) { // key
  const {
    _key
  } = ctx.params;
  const ordersCollection = db.collection('Orders');
  const order = ordersCollection.document(_key);
  if (!order) ctx.throw(404, 'Document not found');
  await ordersCollection.remove(_key);
  ctx.body = {}
}

async function updateOrder(ctx) { // key
  const {
    _key
  } = ctx.params;
  const {
    orderData
  } = ctx.request.body;
  const ordersCollection = db.collection('Orders');
  const order = ordersCollection.document(_key);
  if (!order) ctx.throw(404, 'Document not found');
  _.merge(order, orderData);
  // Joi.attempt(order, orderSchema);
  orderData.updatedAt = new Date();
  orderData.updatedBy = ctx.state.user._id;
  await ordersCollection.update(_key, orderData);
  ctx.body = {}
}

router
  .get('/', filterOrders)
  .post('/', createOrder)
  .get('/:_key', getOrder)
  .delete('/:_key', deleteOrder)
  .patch('/:_key', updateOrder)

module.exports = router.routes();
