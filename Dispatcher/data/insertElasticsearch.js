const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const dynamo = new AWS.DynamoDB.DocumentClient();
var documentClient = new AWS.DynamoDB.DocumentClient();
const axios = require('axios');

let params = {
  TableName : 'TNT-Records',
  ExclusiveStartKey: null
};

let count = 0;

const insertDocs = (data) => {
  const items = data.Items;
  console.log(`inserting ${items.length} items..`);
  count = count + items.length;
  // const normalized = Object.assign({}, items[10], { nlpEn: [], nlpZh: [], ocr: items[10].ocr[0] });
  // console.log(normalized);
  //
  // return axios({
  //   method: 'PUT',
  //   url: `https://search-nationaltreasure-qx7vvzfgy3civ5j6nsw3eoc4hy.us-east-1.es.amazonaws.com/documents/document/${items[10].uid}`,
  //   data: normalized
  // })
  // .then(res => console.log(res.data))
  // .catch(err => console.log(err))
  // *****************************
  const NAIDUpdatePromises = items.map(e => setTimeout(() => axios({
    method: 'PUT',
    url: `https://search-nationaltreasure-qx7vvzfgy3civ5j6nsw3eoc4hy.us-east-1.es.amazonaws.com/documents/document/${e.uid}`,
    data: Object.assign({}, e, { nlpEn: [], nlpZh: [], ocr: e.ocr && e.ocr[0], translate: e.translate && e.translate[0] })
  })
  .then(res => console.log(res.data._id + ' ✓'))
  .catch(err => console.log(err)), Math.random() * 3000));

  return Promise.all(NAIDUpdatePromises)
  .then((res) => {
    console.log('✓');
    if (data.LastEvaluatedKey) {
      params.ExclusiveStartKey = data.LastEvaluatedKey;
      return setTimeout(() => documentClient.scan(params).promise().then(insertDocs), Math.random() * 5000);
      // return console.log(res.data);
    } else {
      return console.log(`all done processing ${count} items`);
    }
  })
  .catch(err => console.log(err.data));
}



documentClient.scan(params).promise().then(insertDocs);
