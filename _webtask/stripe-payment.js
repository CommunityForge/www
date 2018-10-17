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
                return errorResponse({
                    res: res,
                    e: e,
                })
            });
    };


function errorResponse(cfg) {
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


function basePreprocess(args) {
    let meta;
    try {
        meta = JSON.parse(args.stripeMetadata || '{}');
    } catch(e) {
        console.log(e);
        return errorResponse({
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

let productPreprocess = {};

productPreprocess['prod_ChLIFCpTiz59TQ'] = function(res, args) {
    let params = basePreprocess(args);
    let meta = Object.assign(params.meta, args.metadata);
    if (meta.tshirt_size == 'false') {
        meta.tshirt_size = null;
    }
    params['meta'] = meta;
    let yearly_amount_min = (meta.program == 'builder' ? 1500 : 5000);

    if ((!params.reocurring &&    params.amount < yearly_amount_min) || 
        ( params.reocurring && 12*params.amount < yearly_amount_min)) {
        return errorResponse({
            res: res,
            msg: 'You must donate more than $50 annually to become a member',
            code: 400,
        });
    }
    return params;
}

productPreprocess['prod_ChLH0CqLNzANNR'] = function(res, args) {
    return basePreprocess(args);
}


productPreprocess['prod_DncyKfT2YLWQvW'] = productPreprocess['prod_ChLH0CqLNzANNR']; // dev donate
productPreprocess['prod_DncvUcw6Jh7HgY'] = productPreprocess['prod_ChLIFCpTiz59TQ']; // dev member

async function findOrCreateCustomer(_stripe, params) {
    let customers = await _stripe.customers.list({
        email: params.email
    });

    if (customers.data.length) {
        let customer = customers.data[0];
        let meta = Object.assign(params.meta, customer.metadata);
        return _stripe.customers.update(customer.id, {
            source: params.source,
            //metadata: meta
        });
    } else {
        return _stripe.customers.create({
            email: params.email,
            source: params.source,
            //metadata: params.meta,
        });
    }
}

async function logUserGoogleSheets(userData, GDRIVE_PRIVATE_KEY) {
    const product = userData.productId;
    const sheetLookup = {
        'prod_DncvUcw6Jh7HgY': '1z9f59uFfyaZMKfXdAACdJY9bY4RZZ_2FuHqkwgzX7R8',
        'prod_ChLIFCpTiz59TQ': '1z9f59uFfyaZMKfXdAACdJY9bY4RZZ_2FuHqkwgzX7R8',
    };

    if (!(product in sheetLookup)) {
        console.log("Product not in sheet lookup... not logging", product);
        return
    }

    let doc = new GoogleSpreadsheet(sheetLookup[product]);
    await promisify(doc.useServiceAccountAuth)({
        client_email: 'taskrunner@membership-data-tracker.iam.gserviceaccount.com',
        private_key: GDRIVE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    let info = await promisify(doc.getInfo)();
    const worksheet = info.worksheets[0];

    const meta = userData.meta;

    let name = meta.shipping_name;
    const firstname = name.substring(0, name.indexOf(' '))
    const lastname = name.substring(name.indexOf(' '))
    const address = `${meta.shipping_name}, ${meta.shipping_address_line1}, ${meta.shipping_address_state}, ${meta.shipping_address_city}, ${meta.shipping_address_zip}`
    const amount = (
        "$" +
        (userData.amount / 100).toFixed(2) +
        (userData.reocurring ? ' monthly' : '')
    );
    const expiration = userData.reocurring ? "TBA" : new Date().setFullYear(new Date().getFullYear() + 1).toLocaleDateString();

    let updates = {
        lastname: lastname,
        firstname: firstname,
        date: (new Date()).toLocaleDateString(),
        email: userData.email,
        planningcommittee: meta.planning_committee,
        shirtsize: meta.tshirt_size,
        idealuseoffunds: meta.use_of_funds,
        wilkinsburgresident: meta['wilkinsburg_resident'],
        address: address,
        moreaboutyou: meta['interest'],
        cashorcredit: 'Credit',
        amountpaid: amount,
        paymentreceived: 'Yes (Stripe)',
        membershipexpiration: expiration,
    }
    let newRow = await promisify(worksheet.addRow)(updates);
}

app.get('/', asyncMiddleware(async (req, res) => {
    return res.json({
        code: 200,
        msg: 'ELO',
    })
}))

app.post('/payment', asyncMiddleware(async (req, res) => {
    const ctx = req.webtaskContext;
    let STRIPE_SECRET_KEY = ctx.secrets.STRIPE_SECRET_KEY;
    const GDRIVE_PRIVATE_KEY = ctx.secrets.GDRIVE_PRIVATE_KEY;
    try {
        var params = productPreprocess[req.body.productId](res, req.body)
        if ('debug' in params['meta']) {
            STRIPE_SECRET_KEY = ctx.secrets.STRIPE_SECRET_KEY_TEST;
        }
    } catch(e) {
        console.log(e);
        return errorResponse({
            res: res,
            msg: 'Invalid product',
            e: e,
            code: 400,
        });
    }
    if (params === null) { return }

    const _stripe = stripe(STRIPE_SECRET_KEY);
    let customer = await findOrCreateCustomer(_stripe, {
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
        res.json(subscription);
    } else {
        let charge = await _stripe.charges.create({
            amount: params.amount,
            currency: 'usd',
            customer: customer.id,
            description: params.description,
        })
        if (charge === null) { throw "Could not create charge"; }
        res.json(charge);
    }
    await logUserGoogleSheets(params, GDRIVE_PRIVATE_KEY);
}));

module.exports = fromExpress(app);
