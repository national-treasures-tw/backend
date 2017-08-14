const AWS = require('aws-sdk');
const dynamoTable = process.env.TABLE_NAME;
const dynamo = new AWS.DynamoDB.DocumentClient();

// Auto comfirm all sign up via Lambda Triggers
exports.handler = function(event, context) {
    // This Lambda function returns a flag to indicate if a user should be auto-confirmed.

    // Perform any necessary validations.

    // Impose a condition that the minimum length of the username of 5 is imposed on all user pools.
    if (event.userName.length < 5) {
        var error = new Error('failed!');
        context.done(error, event);
    }

    // Access your resource which contains the list of emails of users who were invited to sign up

    // Compare the list of email IDs from the request to the approved list
    if(event.userPoolId === "us-east-1_8JaJl8ZVD") {
        event.response.autoConfirmUser = true;
        event.response.autoVerifyEmail = true;
        console.log('Confirm and Set email verified');
    }

    // create an user record in db
    const { userName, userPoolId, callerContext, request } = event;
    const dbParams = {
        TableName: dynamoTable,
        Item: {
          userId: userName,
          userPoolId,
          clientId: callerContext.clientId,
          nickname: request.userAttributes.nickname,
          email: request.userAttributes.email,
          provider: 'cognito',
          avatarUrl: null
        }
    };


    dynamo.put(dbParams).promise()
    .then(() => {
      // Return result to Cognito
      console.log('user record successfully created');
      context.done(null, event);
    })
    .catch((err) => {
      console.log(err.message);
      context.done(err.message, event);
    });
};
