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
        ":v_title": 'Thu Oct 26',
        ":this_user": 'ac60712f-205f-4402-ab82-5bed026e321d'
    },
    "ScanIndexForward": true,
    // ExclusiveStartKey:  { uid: 'bfcd6c50-ba8f-11e7-864d-e75578acc181',
    //  primaryTag: 'Thu Oct 26',
    //  timestamp: 1509051182 }
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
  const filterItems = data.Items.filter((e, i) => i !== 0 && e.timestamp - f[i - 1].timestamp < 1);
  const possibleDuplicateCount = filterItems.length;
  // console.log(filterItems);
  // console.log('========')
  console.log(data);
  console.log(`Possible Duplicate Count is ${possibleDuplicateCount}`);
  // const deleteParams = filterItems.map(e => ({
  //    DeleteRequest: {
  //      Key: { uid: e.uid }
  //    }
  //  }));
  //
  //   const chunkedParas = _.chunk(deleteParams, 25);
  //
  //   const chunkedPromises = chunkedParas.map((chunk) => {
  //   	const params = {
  //   		RequestItems: {
  //   			'TNT-Records': chunk
  //   		}
  //   	};
  //   	return dynamo.batchWrite(params).promise();
  //   });
  //
  //   return Promise.all(chunkedPromises)
  //   .then(res => console.log(res))
  //   .catch(err => console.log(err))
})
