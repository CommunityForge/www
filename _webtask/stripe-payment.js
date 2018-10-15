'use latest';

import express from 'express';
import { fromExpress } from 'webtask-tools';
import bodyParser from 'body-parser';
import stripe from 'stripe';

var app = express();
app.use(bodyParser.urlencoded({
  extended: true,
}));

function base_preprocess(args) {
    try {
        var meta = JSON.parse(args.stripeMetadata || '{}');
    } catch(e) {
        res.json({
            statusCode: 400,
            message: "Invalid request, please try again or contact the website owner: " + e,
        })
        return null
    }
    return {
        reocurring: (args.reocurring == 'true'),
        amount: (+args.amount) * 100,
        description: args.description,
        productId: args.productId,
        source: args.stripeToken,
        email: args.email,
        meta: meta,
    };
}

var product_preprocess = {};

product_preprocess['prod_ChLIFCpTiz59TQ'] = function(res, args) {
    var params = base_preprocess(args);
    var meta = Object.assign(params.meta, args.metadata);
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

product_preprocess['prod_ChLH0CqLNzANNR'] = function(res, args) {
    return base_preprocess(args);
}

function find_or_create_customer(_stripe, params) {
    return _stripe.customers.list({
        email: params.email
    }).then(customers => {
        if (customers.data.length) {
            var customer = customers.data[0];
            var meta = Object.assign(params.meta, customer.metadata);
            return _stripe.customers.update(customer.id, {
                source: params.source,
                metadata: meta
            });
        } else {
            return _stripe.customers.create({
                email: params.email,
                source: params.source,
                metadata: params.meta,
            });
        }
    })
}


app.post('/payment',    (req,res) => {
    var ctx = req.webtaskContext;
    var STRIPE_SECRET_KEY = ctx.secrets.STRIPE_SECRET_KEY;
    var args = req.body;
    var params = product_preprocess[req.body.productId](res, req.body)
    if (params === null) { return }

    var _stripe = stripe(STRIPE_SECRET_KEY);
    find_or_create_customer(_stripe, {
        email: params.email,
        source: params.source,
        meta: params.meta,
    }).catch(e => {
        res.json(e);
        return Promise.reject(e);
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
                return Promise.reject(e);
            }).then(plan => {
                if (plan === null) { return null; }
                _stripe.subscriptions.create({
                    customer: customer.id,
                    items: [{plan: plan.id}],
                }).catch(e => {
                    res.json(e);
                    return Promise.reject(e);
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
                return Promise.reject(e);
            }).then(charge => {
                if (charge === null) { return null; }
                return res.json(charge);
            });
        }
    });
});

module.exports = fromExpress(app);
