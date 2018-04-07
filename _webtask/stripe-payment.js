'use latest';

import express from 'express';
import { fromExpress } from 'webtask-tools';
import bodyParser from 'body-parser';
import stripe from 'stripe';

var app = express();
app.use(bodyParser.urlencoded({
  extended: true,
}));

var preprocess_membership = function(res, args) {
    var params = {
        reocurring: (args.reocurring == 'true'),
        amount: (+args.amount) * 100,
        description: args.description,
        productId: args.productId,
    };
    try {
        var stripeMeta = JSON.parse(args.stripeMetadata);
    } catch(e) {
        res.json({
            statusCode: 400,
            message: "Invalid request, please try again or contact the website owner: " + e,
        })
        return null
    }
    var meta = Object.assign(args.metadata, stripeMeta);
    if (meta.tshirt_size == 'false') {
        meta.tshirt_size = null;
    }
    params['meta'] = meta;

    if ((!params.reocurring &&    params.amount < 5000) || 
        ( params.reocurring && 12*params.amount < 5000)) {
        res.json({
            statusCode: 400,
            message: 'You must donate more than $50 annually to become a member'
        });
        return null;
    }
    return params;
}

var preprocess = {
    'prod_CdNNverDybFRU1': preprocess_membership,
}

app.post('/payment',    (req,res) => {
    var ctx = req.webtaskContext;
    var STRIPE_SECRET_KEY = ctx.secrets.STRIPE_SECRET_KEY;
    var args = req.body;
    var params = preprocess[req.body.productId](res, req.body)
    if (params === null) { return }

    var _stripe = stripe(STRIPE_SECRET_KEY);
    _stripe.customers.create({
        email: params.email,
        source: params.stripeToken,
        metadata: params.meta,
    }).catch(e => {
        res.json(e);
        return null;
    }).then(customer => {
        if (customer === null) { return null; }
        if (params.reocurring) {
            _stripe.plans.create({
                product: params.productId,
                currency: 'usd',
                interval: 'month',
                nickname: params.description,
                amount: params.amount,
            }).catch(e => {
                res.json(e);
                return null;
            }).then(plan => {
                if (plan === null) { return null; }
                _stripe.subscriptions.create({
                    customer: customer.id,
                    items: [{plan: plan.id}],
                }).catch(e => {
                    res.json(e);
                    return null;
                }).then(subscription => {
                    if (subscription === null) { return null; }
                    res.json(subscription);
                    return 
                });
            });
        } else {
            _stripe.charges.create({
                amount: params.amount,
                currency: 'usd',
                customer: customer.id,
                description: params.description,
            }).catch(e => {
                res.json(e);
                return null;
            }).then(charge => {
                if (charge === null) { return null; }
                return res.json(charge);
            });
        }
    });
});

module.exports = fromExpress(app);
