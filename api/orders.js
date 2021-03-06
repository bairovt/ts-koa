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
  let orders = await db.query(aql`FOR o IN Orders
    FILTER o.status == ${filter.status}
    FILTER ${!!filter.meat} ? o.meat == ${filter.meat} : true
    FILTER ${!!filter.provider} ? o.provider == ${'Providers/' + filter.provider} : true
    SORT o.date ASC
    RETURN {
      _id: o._id,
      _key: o._key,
      date: o.date,
      meat: o.meat,
      provider: DOCUMENT(o.provider),
      kg: o.kg,
      kgFact: o.kgFact,
      status: o.status,
      comment: o.comment,
      createdBy: o.createdBy
    }`).then(cursor => cursor.all());
  ctx.body = {
    orders
  };
}

async function getOrder(ctx, next) {
  const {
    _key
  } = ctx.params;

  let order = await db.query(aql`FOR o IN Orders
    FILTER o._key == ${_key}    
    RETURN {
      _id: o._id,
      _key: o._key,
      date: o.date,
      meat: o.meat,
      provider: DOCUMENT(o.provider),
      kg: o.kg,
      kgFact: o.kgFact,
      status: o.status,
      comment: o.comment,
      createdBy: o.createdBy
    }`).then(cursor => cursor.next());

  if (!order) ctx.throw(404, 'Document not found');
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
  const kgFact = ctx.request.body.kgFact;
  if (Number.isFinite(kgFact) && kgFact > 0) {
  } else {
    ctx.throw(400, 'Wrong data: kgFact')
  };
  const ordersCollection = db.collection('Orders');
  const order = ordersCollection.document(_key);
  if (!order) ctx.throw(404, 'Document not found');
  const orderData = {
    kgFact,
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
