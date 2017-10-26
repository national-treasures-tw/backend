const AWS = require('aws-sdk');
const uuidV1 = require('uuid/v1');
const dynamo = new AWS.DynamoDB.DocumentClient();
const dynamoTable = process.env.TABLE_NAME;
const editHistoryTable = process.env.EDIT_HISTORY_TABLE_NAME;

// update the orc/translate in records 
// and create a new item in edit history table
const calibrateRecord = (event, callback) => {
  const { uid, oldText, newText, type, userId } = JSON.parse(event.body);

  dynamo.update({
    Key: { uid },
    TableName: dynamoTable,
    ReturnValues: 'ALL_NEW',
    ExpressionAttributeNames: { "#DK": type },
    ExpressionAttributeValues: { ":d": [newText] },
    UpdateExpression: 'SET #DK = :d'
  }).promise()
  .then(() => {
  	const dbParams = {
	    TableName: editHistoryTable,
	    Item: {
	      uid: uuidV1(),
	      timestamp: new Date().getTime(),
	      type,
	      text: oldText,
	      userId,
	      recordId: uid
	    }
  	};
  	return dynamo.put(dbParams).promise();
  })
  .then(() => {
    // console.log('image successfully uploaded to s3, data stored in dynamo');
    callback(null, { success: true })
  })
  .catch((err) => {
    console.log(err.message);
    callback(err);
  });
 
}


exports.handler = (event, context, callback) => {
  // console.log('Received event:', JSON.stringify(event, null, 2));

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

      calibrateRecord(event, done);
      break;
    case 'PUT':

      break;
    default:
      done(new Error(`Unsupported method "${event.httpMethod}"`));
  }
};
