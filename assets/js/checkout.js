function _handleToken(form, url) {
    return function(token, meta) {
        form.find('.checkout_autoadd').remove()
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
                    console.log(data);
                    notify_modal('<h1>Error</h1><p>' + data.message + '</p>', 'is-danger');
                }
            },
            error: function(data) {
                console.log(data);
                notify_modal('<h1>Error</h1><p>' + data + '</p>', 'is-danger');
            }
        });
    }
}

function _addHidden(form, name, value) {
    $('<input>').attr({
        type: 'hidden',
        class: 'checkout_autoadd',
        name: name,
        value: value,
    }).appendTo(form);
}

function attachCheckout(form, product_name, validation, checkout_url, checkout_cfg) {
    checkout_cfg = checkout_cfg || {};
    default_cfg = {
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
        var reocurring = (form.find('select#reocurring').val() == 'true');

        if (isNaN(amount)) {
            notify_modal('<p>Please enter a valid amount in USD ($).</p>', 'is-danger');
        } else if (validate !== undefined && validate(form, amount)) {
            amount = amount * 100;
            handler.open({
                amount: Math.round(amount),
                panelLabel: 'Pay \{\{amount\}\}' + ((reocurring) ? ' per month' : '')
            })
        }
    })
}
