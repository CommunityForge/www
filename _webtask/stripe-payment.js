'use latest';

import express from 'express';
import { fromExpress } from 'webtask-tools';
import bodyParser from 'body-parser';
import stripe from 'stripe';

var app = express();
app.use(bodyParser.urlencoded());

function extend(obj, src) {
    for (var key in src) {
        if (src.hasOwnProperty(key)) obj[key] = src[key];
    }
    return obj;
}

app.get('/payment',  (req,res) => {
  var ctx = req.webtaskContext;
  var STRIPE_SECRET_KEY = ctx.secrets.STRIPE_SECRET_KEY;
  var reocurring = (req.query.reocurring == 'true');
  var amount = (+req.query.amount) * 100;
  var productId = req.query.productId;
  var meta = extend(req.query.metadata, req.query.stripeMetadata);
  console.log(req.query.metadata);
  console.log(req.query.stripeMetadata);
  console.log(amount);
  console.log(productId);
  var description = req.query.description;
  if ((!reocurring && amount < 5000) || 
      (reocurring && 12*amount < 5000)) {
        return res.end('You must donate more than $50 annually to become a member');
  }

  var _stripe = stripe(STRIPE_SECRET_KEY);
  _stripe.customers.create({
    email: req.query.email,
    source: req.query.stripeToken,
    metadata: meta,
  }).then(customer => {
    console.log(customer);
    if (reocurring) {
      _stripe.plans.create({
        product: productId,
        currency: 'usd',
        interval: 'month',
        nickname: description,
        amount: amount,
      }).then(plan => {
        console.log(plan);
        _stripe.subscriptions.create({
          customer: customer.id,
          items: [{plan: plan.id}],
        }).then(subscription => {
          console.log(subscription);
          return res.json(subscription);
        });
      });
    } else {
      _stripe.charges.create({
        amount: amount,
        currency: 'usd',
        customer: customer.id,
        description: description,
      }).then(charge => {
        return res.json(charge);
      });
    }
  });
});

module.exports = fromExpress(app);
