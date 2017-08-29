/* Clean up scripts run once after dataPiper.js deposits the records */

const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const dynamo = new AWS.DynamoDB.DocumentClient();

var params = {
  TableName : 'TNT-Records',
  FilterExpression : 'primaryTag = :this_naid',
  ExpressionAttributeValues : {':this_naid' : '中美斷交'},
  // ExclusiveStartKey: { uid: '58661d00-88fd-11e7-a0de-e3e5df802c1a' }
};

const queryGSIParams = {
    "TableName": 'TNT-Records',
    "IndexName": 'primaryTag-timestamp-index',
    "KeyConditionExpression": "primaryTag = :v_title",
    "ExpressionAttributeValues": {
        ":v_title": '美援'
    },
    "ScanIndexForward": true,
    ExclusiveStartKey: { uid: 'c4334110-8903-11e7-b357-df32cda057f3',
     primaryTag: '美援',
     timestamp: 1503601759 }
    // Limit: 500
};

// var params = {
//   TableName : 'TNT-Catalog',
//   FilterExpression: "attribute_not_exists(isBlocked)",
//   Limit: 10
// };

var documentClient = new AWS.DynamoDB.DocumentClient();

documentClient.query(queryGSIParams, function(err, data) {
 if (err) console.log(err);
 // console.log(data);
  console.log(data);

})

/* Testing inserting new attributes 'dispatchedAt' in the items */
// ===================================
// documentClient.scan(params, function(err, data) {
//    if (err) console.log(err);
//    // console.log(data);
//    const items = data.Items;
//    console.log(`updating ${items.length} items..`);
//
//    const UpdatePromises = items.map(e => dynamo.update({
//      Key: { uid: e.uid },
//      TableName: 'TNT-Catalog',
//      ReturnValues: 'ALL_NEW',
//      ExpressionAttributeNames: { "#DK": 'dispatchedAt' },
//      ExpressionAttributeValues: { ":d": new Date().getTime() },
//      UpdateExpression: 'SET #DK = :d'
//    }).promise());
//
//    return Promise.all(UpdatePromises)
//    .then(() => console.log('all done'))
//    .catch(err => console.log(err));
//  })

/* To delete some duplicate records */
// ===================================
// documentClient.scan(params, function(err, data) {
//    if (err) console.log(err);
//    // console.log(data);
//    const items = data.Items;
//    console.log(`updating ${items.length} items..`);
//
//    const deleteParams = items.map(e => ({
//      DeleteRequest: {
//        Key: { uid: e.uid }
//      }
//    }));
//
//    const params = {
//       RequestItems: {
//         'TNT-Catalog': deleteParams
//       }
//     };
//
//     return documentClient.batchWrite(params).promise()
//     .then(() => console.log('all done'))
//     .catch(err => console.log(err));
//  })

/* Updating seriesId / NAID */
// ===================================
// documentClient.scan(params, function(err, data) {
//    if (err) console.log(err);
//    // console.log(data);
//    const items = data.Items;
//    console.log(`updating ${items.length} items..`);
  // const NAIDUpdatePromises = items.map(e => dynamo.update({
  //   Key: { uid: e.uid },
  //   TableName: 'TNT-Catalog',
  //   ReturnValues: 'ALL_NEW',
  //   ExpressionAttributeNames: { "#DK": 'seriesId' },
  //   ExpressionAttributeValues: { ":d": '1742010' },
  //   UpdateExpression: 'SET #DK = :d'
  // }).promise());
  //
  // return Promise.all(NAIDUpdatePromises)
  // .then(() => console.log('all done'))
  // .catch(err => console.log(err));
//})

/* For updating some missing compartment and shelf numbers in some items */
// ===================================
// documentClient.scan(params, function(err, data) {
//    if (err) console.log(err);
//    const items = data.Items;
//    console.log(`updating ${items.length} items..`);
//    const compartmentUpdatePromises = items.map(e => dynamo.update({
//      Key: { uid: e.uid },
//      TableName: 'TNT-Catalog',
//      ReturnValues: 'ALL_NEW',
//      ExpressionAttributeNames: { "#DK": 'Compartment' },
//      ExpressionAttributeValues: { ":d": e.boxRange[0] < 43 ? '035' : '001/01-005/05' },
//      UpdateExpression: 'SET #DK = :d'
//    }).promise());
//
//    const rowUpdatePromises = items.map(e => dynamo.update({
//      Key: { uid: e.uid },
//      TableName: 'TNT-Catalog',
//      ReturnValues: 'ALL_NEW',
//      ExpressionAttributeNames: { "#DK": 'Row' },
//      ExpressionAttributeValues: { ":d": e.boxRange[0] < 43 ? '75' : '76' },
//      UpdateExpression: 'SET #DK = :d'
//    }).promise());
//
//    const shelfUpdatePromises = items.map(e => e.boxRange[0] < 43 ? dynamo.update({
//      Key: { uid: e.uid },
//      TableName: 'TNT-Catalog',
//      ReturnValues: 'ALL_NEW',
//      ExpressionAttributeNames: { "#DK": 'Shelf' },
//      ExpressionAttributeValues: { ":d": '02-07' },
//      UpdateExpression: 'SET #DK = :d'
//    }).promise() : Promise.resolve() );
//
//    return Promise.all(compartmentUpdatePromises)
//    .then(() => Promise.all(rowUpdatePromises))
//    .then(() => Promise.all(shelfUpdatePromises))
//    .then(() => console.log('all done'))
//    .catch(err => console.log(err));
// });
