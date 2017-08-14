const AWS = require('aws-sdk');
const uuidV1 = require('uuid/v1');
const dynamo = new AWS.DynamoDB.DocumentClient();

// dispatches an record from catalog
const dispatchRecord = (event, callback) => {
  const { userId, isTest } = JSON.parse(event.body);
  const params = {
    TableName : 'TNT-Catalog',
    FilterExpression: "attribute_not_exists(isBlocked)",
    Limit: 50
  };

  let chosenRecord;
  // scan the catalog for undispatched records (i.e. is not blocked)
  dynamo.scan(params).promise()
  .then((data) => {
    // pick out a random record
    const randomIndex = Math.ceil(Math.random() * 10); // 1 ~ 10
    chosenRecord = data.Items[randomIndex];

    if (isTest) {
      return Promise.resolve();
    }

    // updated the record { isBlocked: true } so it won't be double dispatched
    return dynamo.update({
      Key: { uid: chosenRecord.uid },
      TableName: 'TNT-Catalog',
      ReturnValues: 'ALL_NEW',
      ExpressionAttributeNames: { "#DK": 'isBlocked' },
      ExpressionAttributeValues: { ":d": true },
      UpdateExpression: 'SET #DK = :d'
    }).promise();
  })
  .then(() => {
    // create a db entry for the dispatch
    const dbParams = {
      TableName: 'TNT-Dispatcher',
      Item: {
        uid: uuidV1(),
        catalogId: chosenRecord.uid,
        userId,
        NAID: chosenRecord.NAID,
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
        status: 'dispatched' // enum['dispatched', 'complete', 'incomplete', 'error']
      }
    };
    return dynamo.put(dbParams).promise();
  })
  .then(() => {
    // return the record to the client
    console.log('a record from NA catalog is successfully dispatched!');
    callback(null, { success: true, record: chosenRecord })
  })
  .catch(err => {
    console.log(err);
    callback(err);
  })
};

const updateDispatch = (event, callback) => {
  const { userId, dispatchId, status } = JSON.parse(event.body);

  // query the dispatch
  dynamo.get({ Key: { uid: dispatchId }, TableName: 'TNT-Dispatcher' }).promise()
  .then((result) => {
    const dispatch = result.Item;
    if (dispatch.userId !== userId) throw Error('Impermissible action');

    return dynamo.update({
       Key: { uid: dispatchId },
       TableName: 'TNT-Dispatcher',
       ReturnValues: 'ALL_NEW',
       ExpressionAttributeNames: { "#DK": 'status', '#UA': 'updatedAt' },
       ExpressionAttributeValues: { ":d": status, ":u": new Date().getTime() },
       UpdateExpression: 'SET #DK = :d, #UA = :u'
     }).promise();

  })
  .then(() => {
    console.log('The dispatch status is successfully updated!');
    callback(null, { success: true })
  })
  .catch(err => callback(err));
}


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

      dispatchRecord(event, done);
      break;
    case 'PUT':

      updateDispatch(event, done);
      break;
    default:
      done(new Error(`Unsupported method "${event.httpMethod}"`));
  }
};
