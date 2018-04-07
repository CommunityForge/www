function _handleToken(form, url) {
    return function(token, meta) {
        _addHidden(form, 'stripeToken', token.id);
        _addHidden(form, 'email', token.email);
        _addHidden(form, 'stripeMetadata', JSON.stringify(meta));

        notify_modal('<h1>Processing Order</h1><p><a class="button is-primary is-loading">Loading</a></p>')
        $.ajax({
            type: "POST",
            url: url,
            data: form.serialize(), // serializes the form's elements.
            success: function(data) {
                if (data.statusCode === undefined) {
                    notify_modal('<p>Order Complete!</p>', 'is-success');
                } else {
                    notify_modal('<h1>Error</h1><p>' + data.message + '</p>', 'is-danger');
                }
            },
            error: function(data) {
                notify_modal('<h1>Error</h1><p>' + data + '</p>', 'is-danger');
            }
        });
    }
}

function _addHidden(form, name, value) {
    $('<input>').attr({
        type: 'hidden',
        name: name,
        value: value,
    }).appendTo(form);
}

function attachCheckout(form, product_name, stripe_public_token, checkout_url, checkout_cfg, validation) {
    checkout_cfg = {} || checkout_cfg;
    default_cfg = {
        key: stripe_public_token,
        locale: 'auto',
        name: product_name,
        zipCode: true,
        token: _handleToken(form, checkout_url)
    }
    checkout_cfg = Object.assign(default_cfg, checkout_cfg);
    var handler = StripeCheckout.configure(checkout_cfg);
    
    form.find(":submit").on('click', function(e) {
        e.preventDefault();
        var amount = form.find('input#amount').val();
        amount = amount.replace(/\$/g, '').replace(/\,/g, '');
        amount = parseFloat(amount);

        if (isNaN(amount)) {
            notify-modal('<p>Please enter a valid amount in USD ($).</p>', 'is-danger');
        } else if (validate !== undefined && validate(form, amount)) {
            amount = amount * 100;
            handler.open({
                amount: Math.round(amount),
                panelLabel: '\{\{amount\}\}' + ((reocurring) ? ' per month' : '')
            })
        }
    })
}
