'use strict';
const db = require('../lib/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');

const router = new Router();

async function report1(ctx, next) {
  const filter = {
    meat: ctx.query.meat || ''
  };
  let rows = await db.query(aql`FOR o IN Orders
    FILTER o.meat == ${filter.meat}
    COLLECT provider = o.provider INTO items = {"meat": o.meat, "status": o.status, "kg": o.kg, "kgFact": o.kgFact}  
    SORT SUM(items[*].kgFact) DESC
    RETURN {
      "providerId": provider,
      "provider": DOCUMENT(provider).name,
      "ordersCnt": LENGTH(items),
      "deliveredCnt": LENGTH(items[* FILTER CURRENT.status == "DELIVERED"]),
      "failedCnt": LENGTH(items[* FILTER CURRENT.status == "FAILED"]),
      "createdCnt": LENGTH(items[* FILTER CURRENT.status == "CREATED"]),
      "avgKgFact": AVG(items[* FILTER CURRENT.status == "DELIVERED"].kgFact) 
    }`).then(cursor => cursor.all());
  ctx.body = {
    rows
  };
}

router
  .get('/1', report1)

module.exports = router.routes();
