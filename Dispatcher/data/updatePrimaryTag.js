const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const dynamo = new AWS.DynamoDB.DocumentClient();
var documentClient = new AWS.DynamoDB.DocumentClient();

// const dispatchId = '389ebfc0-88dc-11e7-96da-1363661d799d';
const primaryTag = "聯合國";
const startYear = 0;
const endYear = 0;

let _params = {
  TableName : 'TNT-Records',
  FilterExpression : 'docId = :this_naid',
  ExpressionAttributeValues : {':this_naid' : '1949719' },
  ExclusiveStartKey: null
};

let params = {
  TableName : 'TNT-Records',
  ExpressionAttributeNames : {'#L' : 'location' },
  FilterExpression : '#L = :this_naid',
  ExpressionAttributeValues : {':this_naid' : 'UN' },
  ExclusiveStartKey: null
};

let count = 0;

const updateDocs = (data) => {
  const items = data.Items;
  console.log(`updating ${items.length} items..`);
  count = count + items.length;
  const NAIDUpdatePromises = items.map(e => e.primaryTag === primaryTag ? Promise.resolve() : dynamo.update({
    Key: { uid: e.uid },
    TableName: 'TNT-Records',
    ReturnValues: 'ALL_NEW',
    ExpressionAttributeNames: { "#DK": 'primaryTag', "#SY": 'startYear', "#EY": 'endYear' },
    ExpressionAttributeValues: { ":d": primaryTag, ":s":  startYear, ":e": endYear },
    UpdateExpression: 'SET #DK = :d, #SY = :s, #EY = :e'
  }).promise());

  return Promise.all(NAIDUpdatePromises)
  .then(() => {
    console.log('this batch done');
    if (data.LastEvaluatedKey) {
      params.ExclusiveStartKey = data.LastEvaluatedKey;
      return setTimeout(() => documentClient.scan(params).promise().then(updateDocs), Math.random() * 10000);
    } else {
      return console.log(`all done processing ${count} items`);
    }
  })
  .catch(err => console.log(err));
}



documentClient.scan(params).promise().then(updateDocs);
