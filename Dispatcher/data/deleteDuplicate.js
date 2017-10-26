/* Delete duplicate images */

const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const dynamo = new AWS.DynamoDB.DocumentClient();
const _ = require('lodash');

var params = {
  TableName : 'TNT-Records',
  FilterExpression : 'primaryTag = :this_naid',
  ExpressionAttributeValues : {':this_naid' : '中美斷交'},
  // ExclusiveStartKey: { uid: '58661d00-88fd-11e7-a0de-e3e5df802c1a' }
};

const queryGSIParams = {
    "TableName": 'TNT-Records',
    "IndexName": 'TagIndex',
    "KeyConditionExpression": "primaryTag = :v_title",
    "FilterExpression" : 'userId = :this_user',
    "ExpressionAttributeValues": {
        ":v_title": '美援',
        ":this_user": '48d3bab0-565d-4126-b79b-eef014aabed5'
    },
    "ScanIndexForward": true,
    ExclusiveStartKey: { uid: 'd23585f0-89d2-11e7-93c8-8f4157e13757',
     primaryTag: '美援',
     timestamp: 1503692399 }
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
  const originalItemsCount = data.Items.length;
  const f = data.Items;
  const filterItems = data.Items.filter((e, i) => i !== 0 && e.timestamp - f[i - 1].timestamp < 4);
  const possibleDuplicateCount = filterItems.length;
  console.log(data);
  console.log(`Possible Duplicate Count is ${possibleDuplicateCount}`);
  const deleteParams = filterItems.map(e => ({
     DeleteRequest: {
       Key: { uid: e.uid }
     }
   }));

    const chunkedParas = _.chunk(deleteParams, 25);

    const chunkedPromises = chunkedParas.map((chunk) => {
    	const params = {
    		RequestItems: {
    			'TNT-Records': chunk
    		}
    	};
    	return dynamo.batchWrite(params).promise();
    });

    return Promise.all(chunkedPromises)
    .then(res => console.log(res))
    .catch(err => console.log(err))
})
