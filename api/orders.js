'use strict';
const db = require('../lib/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');
const Joi = require('joi');
const _ = require('lodash');
const orderSchema = require('../lib/schemas').orderSchema;

const router = new Router();

async function filterOrders(ctx, next) {
  const filter = {
    status: ctx.query.status || '',
    meat: ctx.query.meat || '',
    provider: ctx.query.provider || ''
  };
  let orders = await db.query(aql`FOR order IN Orders
  FILTER order.status == ${filter.status}
  FILTER ${!!filter.meat} ? order.meat == ${filter.meat} : true
  FILTER ${!!filter.provider} ? order.provider == ${'Providers/' + filter.provider} : true
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
  const validOrder = Joi.attempt(orderData, orderSchema);
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

async function deleteOrder(ctx) {
  const {
    _key
  } = ctx.params;
  const ordersCollection = db.collection('Orders');
  const order = ordersCollection.document(_key);
  if (!order) ctx.throw(404, 'Document not found');
  await ordersCollection.remove(_key);
  ctx.body = {}
}

async function updateOrder(ctx) {
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
  const validOrderData = Joi.attempt(orderData, orderSchema);
  validOrderData.updatedAt = new Date();
  validOrderData.updatedBy = ctx.state.user._id;
  await ordersCollection.update(_key, validOrderData);
  ctx.body = {}
}

async function deliverOrder(ctx) {
  const {
    _key
  } = ctx.params;
  const ordersCollection = db.collection('Orders');
  const order = ordersCollection.document(_key);
  if (!order) ctx.throw(404, 'Document not found');
  const orderData = {
    kgFact: ctx.request.body.kgFact,
    status: 'DELIVERED',
    updatedAt: new Date(),
    updatedBy: ctx.state.user._id
  };
  await ordersCollection.update(_key, orderData);
  ctx.body = {}
}

async function failOrder(ctx) {
  const {
    _key
  } = ctx.params;
  const ordersCollection = db.collection('Orders');
  const order = ordersCollection.document(_key);
  if (!order) ctx.throw(404, 'Document not found');
  const orderData = {
    status: 'FAILED',
    kgFact: 0,
    updatedAt: new Date(),
    updatedBy: ctx.state.user._id
  };
  await ordersCollection.update(_key, orderData);
  ctx.body = {}
}

router
  .get('/', filterOrders)
  .post('/', createOrder)
  .get('/:_key', getOrder)
  .delete('/:_key', deleteOrder)
  .post('/:_key', updateOrder)
  .post('/:_key/deliver', deliverOrder)
  .post('/:_key/fail', failOrder)

module.exports = router.routes();
