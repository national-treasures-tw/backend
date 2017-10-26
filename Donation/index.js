const stripe = require("stripe")(
  process.env.STRIPE_KEY || "sk_test_KEy9QTdySEWMYVG6v2suHwAi"
);

// dispatches an record from catalog
const createDonation = (event, callback) => {
  const { token, email, amount } = JSON.parse(event.body);

  stripe.charges.create({
    amount: amount,
    currency: "usd",
    source: token, // obtained with Stripe.js
    description: `Donation from ${email}`,
    receipt_email: email,
    statement_descriptor: 'Donation to TNTF-國家寶藏'
  }, function(err, charge) {
    // asynchronously called
    if (err) {
      callback(err);
    }
    callback(null, { success: true, message: 'donation is successfully created'});
  });
};


exports.handler = (event, context, callback) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const done = (err, res) => callback(null, {
    statusCode: err ? '400' : '200',
    body: err ? err.message : JSON.stringify(res),
    headers: {
        ContentType: 'application/json',
        'Access-Control-Allow-Origin': '*'
    },
  });

  // const query = event.queryStringParameters;
  // const body = JSON.parse(event.body);

  switch (event.httpMethod) {
    case 'DELETE':

      break;
    case 'POST':

      createDonation(event, done);
      break;
    case 'PUT':

      break;
    default:
      done(new Error(`Unsupported method "${event.httpMethod}"`));
  }
};
