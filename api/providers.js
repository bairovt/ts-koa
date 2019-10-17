'use strict';
const db = require('../lib/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');
const authorize = require('../middleware/authorize');
const Joi = require('joi');
const providerSchema = require('../lib/schemas').providerSchema;

const router = new Router();

async function findProviders(ctx) {
  let search = ctx.query.search || '';
  let providers = await db.query(
    aql`FOR p IN Providers
          FILTER ${!search} ? true : (REGEX_TEST(p.name, ${search}, true) OR
            REGEX_TEST(p.tel, ${search}, true))
          SORT p.name ASC
          RETURN p`)
    .then(cursor => {
      return cursor.all()
    });
  ctx.body = {
    providers
  };
}

async function getProvider(ctx) {
  const {
    _key
  } = ctx.params;
  const {
    user
  } = ctx.state;
  const providersCollection = db.collection('Providers');
  const provider = await providersCollection.document(_key);
  if (!provider) ctx.throw(404);
  provider.editable = await user.hasRoles(['admin']);
  ctx.body = {
    provider
  }
}

async function createProvider(ctx) {
  const {
    providerData
  } = ctx.request.body;
  let validProviderData = Joi.attempt(providerData, providerSchema);
  validProviderData.createdBy = ctx.state.user._id;
  validProviderData.createdAt = new Date();
  const providersCollection = db.collection('Providers');
  const newProvider = await providersCollection.save(validProviderData);
  ctx.body = {
    newProviderKey: newProvider._key
  };
}

async function updateProvider(ctx) {
  const {
    _key
  } = ctx.params;
  const {
    user
  } = ctx.state;
  const providersCollection = db.collection('Providers');
  const provider = providersCollection.document(_key);
  if (!provider) ctx.throw(404);
  let { providerData } = ctx.request.body;
  let validProviderData = Joi.attempt(providerData, providerSchema); // {stripUnknown: true}
  validProviderData.updatedBy = user._id;
  validProviderData.updatedAt = new Date();
  await providersCollection.update(_key, validProviderData);
  ctx.body = {
    result: 'OK'
  };
}

async function deleteProvider(ctx) {
  const {
    _key
  } = ctx.params;
  const providersCollection = db.collection('Providers');
  const provider = await providersCollection.document(_key);
  if (!provider) ctx.throw(404);
  /* сначала удаляем все зависимости от provider: orders, */
  await db.query(`FOR o IN Orders
    FILTER o.provider == ${'Providers/' + _key}
    REMOVE o IN Orders
  `);
  await providersCollection.remove(_key);
  ctx.body = { result: 'OK' }
}

router
  .post('/', authorize(['admin']), createProvider)
  .get('/', findProviders)
  .get('/:_key', getProvider)
  .post('/:_key', authorize(['admin']), updateProvider)
  .delete('/:_key', authorize(['admin']), deleteProvider)

module.exports = router.routes();
