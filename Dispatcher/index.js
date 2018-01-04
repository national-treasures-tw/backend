const AWS = require('aws-sdk');
const uuidV1 = require('uuid/v1');
const dynamo = new AWS.DynamoDB.DocumentClient();

// dispatches an record from catalog
const dispatchRecord = (event, callback) => {
  const { userId, userNickname, isTest } = JSON.parse(event.body);
  let chosenRecord;
  let hasIncompletePastDispatch = false;
  let pastDispatchId = null;

  const scanDispatcherParams = {
    TableName : 'TNT-Dispatcher',
    FilterExpression : 'userId = :this_userid',
    ExpressionAttributeValues : {':this_userid' : userId}
  };

  // 1. we scan dispatch to see if a record has already been dispatched to the user but
  // has not yet been completed (it could be either a. 'incomplete' or 'dispatched')
  dynamo.scan(scanDispatcherParams).promise()
  .then((data) => {
    // we check if any prior dispatched records were not complete
    const incompletePastDispatches = data.Items.filter(dispatch => dispatch.status !== 'complete');
    if (incompletePastDispatches.length > 0) {
      hasIncompletePastDispatch = true;
      pastDispatchId = incompletePastDispatches[0].uid;
      // found past incomplete dispatched record, return catalogId of said record
      return incompletePastDispatches[0].catalogId;
    }
    // no prior record has been dispatched
    return null;
  })
  .then((pastDispatchCatalogId) => {

    if (pastDispatchCatalogId) {
      const scanCatalogParams = {
        TableName : 'TNT-Catalog',
        FilterExpression : 'uid = :this_uid',
        ExpressionAttributeValues : {':this_uid' : pastDispatchCatalogId}
      };
      // using the catalogId, find that past record
      return dynamo.scan(scanCatalogParams).promise()
    }

    const params = {
      TableName : 'TNT-Catalog',
      FilterExpression: "attribute_not_exists(isBlocked)"
      // Limit: 50
    };

    // scan the catalog for any undispatched records (i.e. is not blocked)
    return dynamo.scan(params).promise()
  })
  .then((data) => {
    if (hasIncompletePastDispatch) {
      // found the old incomplete record, dispatch it
      chosenRecord = data.Items[0];
    } else {
      // or, pick out a random record from the scan
      const randomIndex = Math.ceil(Math.random() * 10); // 1 ~ 10
      chosenRecord = data.Items[randomIndex];
    }

    if (isTest) {
      // if this is for local testing, don't block the record for further dispatching
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

    if (hasIncompletePastDispatch) {
      // if this record is from a prior dispatch, don't create a db entry in Dispatcher
      chosenRecord.dispatchId = pastDispatchId;
      return Promise.resolve();
    }
    // create a db entry for the dispatcher
    const uid = uuidV1();
    chosenRecord.dispatchId = uid;
    const dbParams = {
      TableName: 'TNT-Dispatcher',
      Item: {
        uid,
        catalogId: chosenRecord.uid,
        userId,
        user: userNickname,
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
