'use latest';

require("babel-polyfill");
import express from 'express';
import bodyParser from 'body-parser';
import stripe from 'stripe';
import GoogleSpreadsheet from 'google-spreadsheet';
import { promisify } from 'util';
import { fromExpress } from 'webtask-tools';

const app = express();
app.use(bodyParser.urlencoded({
  extended: true,
}));


const asyncMiddleware = fn =>
    (req, res, next) => {
        Promise.resolve(fn(req, res, next))
            .catch((e) => {
                console.log(e);
                return error_response({
                    res: res,
                    e: e,
                })
            });
    };


function error_response(cfg) {
    let {res, msg, e, code} = cfg;
    code = code || 500;
    e = e || '';
    msg = msg || "Something went wrong, please try again or contact the website owner";
    return res.json({
        statusCode: code,
        message: msg,
        debug: "" + e,
    })
}


function base_preprocess(args) {
    try {
        let meta = JSON.parse(args.stripeMetadata || '{}');
    } catch(e) {
        return error_response({
            res: res,
            e: e,
            code: 400,
        })
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

let product_preprocess = {};

product_preprocess['prod_ChLIFCpTiz59TQ'] = function(res, args) {
    let params = base_preprocess(args);
    let meta = Object.assign(params.meta, args.metadata);
    if (meta.tshirt_size == 'false') {
        meta.tshirt_size = null;
    }
    params['meta'] = meta;

    if ((!params.reocurring &&    params.amount < 5000) || 
        ( params.reocurring && 12*params.amount < 5000)) {
        return error_response({
            res: res,
            msg: 'You must donate more than $50 annually to become a member',
            code: 400,
        });
    }
    return params;
}

product_preprocess['prod_ChLH0CqLNzANNR'] = function(res, args) {
    return base_preprocess(args);
}

async function find_or_create_customer(_stripe, params) {
    let customers = await _stripe.customers.list({
        email: params.email
    });

    if (customers.data.length) {
        let customer = customers.data[0];
        let meta = Object.assign(params.meta, customer.metadata);
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
}

app.get('/', asyncMiddleware(async (req, res) => {
    let ctx = req.webtaskContext;
    let doc = new GoogleSpreadsheet('1z9f59uFfyaZMKfXdAACdJY9bY4RZZ_2FuHqkwgzX7R8');
    await promisify(doc.useServiceAccountAuth)({
        client_email: 'taskrunner@membership-data-tracker.iam.gserviceaccount.com',
        private_key: ctx.secrets.GDRIVE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    let info = await promisify(doc.getInfo)();
    let worksheet = info.worksheets[0];
    let rows = await promisify(worksheet.getRows)()
    console.log(rows);
    return res.json({
        code: 200,
        msg: 'ELO',
        info: rows,
    })
}))

app.post('/payment', asyncMiddleware(async (req, res) => {
    let ctx = req.webtaskContext;
    let STRIPE_SECRET_KEY = ctx.secrets.STRIPE_SECRET_KEY;
    let args = req.body;
    try {
        let params = product_preprocess[req.body.productId](res, req.body)
    } catch(e) {
        return error_response({
            res: res,
            msg: 'Invalid product',
            e: e,
            code: 400,
        });
    }
    if (params === null) { return }

    let _stripe = stripe(STRIPE_SECRET_KEY);
    let customer = await find_or_create_customer(_stripe, {
        email: params.email,
        source: params.source,
        meta: params.meta,
    })
    if (customer === null) { throw "Could not create customer"; }
    if (params.reocurring) {
        let plan = await _stripe.plans.create({
            product: params.productId,
            currency: 'usd',
            interval: 'month',
            nickname: params.description,
            amount: params.amount,
        });
        if (plan === null) { throw "Could not create plan"; }
        let subscription = await _stripe.subscriptions.create({
            customer: customer.id,
            items: [{plan: plan.id}],
        })
        if (subscription === null) { throw "Could not create subscription"; }
        return res.json(subscription);
    } else {
        let charge = await _stripe.charges.create({
            amount: params.amount,
            currency: 'usd',
            customer: customer.id,
            description: params.description,
        })
        if (charge === null) { throw "Could not create charge"; }
        return res.json(charge);
    }
}));

module.exports = fromExpress(app);
