const AWS = require('aws-sdk');
const uuidV1 = require('uuid/v1');
const dynamoTable = process.env.TABLE_NAME;
const s3 = new AWS.S3({
  apiVersion: '2006-03-01', // lock in specific version of the SDK
  signatureVersion: 'v4', // S3 requires the "v4" signatureVersion to enable KMS server side encryption
});
const dynamo = new AWS.DynamoDB.DocumentClient();
const originalBucketName = process.env.IMAGE_BUCKET_NAME;
const resizedBucketName = process.env.RESIZED_IMAGE_BUCKET_NAME;
const resizeLambdaFunctionName = process.env.RESIZE_LAMBDA;
const { publishResizeJobToSQS } = require('./sqs.js');

// uploads an image
const uploadImage = (event, callback) => {
  const uid = uuidV1();
  const { docId, email, metadata, timestamp, dispatchId, userId, location, isNotDocument } = event.body;
  const image = new Buffer(event.body.file.replace(/^data:image\/(png|jpeg);base64,/, ''), 'base64');
  const s3Params = {
    Bucket: originalBucketName,
    Key: `${location}/${docId}/${uid}.jpg`,
    Body: image,
    ContentType: 'image/jpeg'
  };

  const dbParams = {
    TableName: dynamoTable,
    Item: {
      uid,
      location,
      docId,
      dispatchId,
      userId,
      metadata,
      timestamp,
      isNotDocument,
      ocr: [],
      translate: [],
      nlpEn: [],
      nlpZh: [],
      isReadyForView: false,
      primaryTag: 'NONE',
      imageKey: s3Params.Key,
      originalUrl: `https://s3.amazonaws.com/${originalBucketName}/${s3Params.Key}`,
      resizedUrls: []
    }
  };

  const scanParams = {
    TableName : 'TNT-Users',
    FilterExpression : 'userId = :this_userid',
    ExpressionAttributeValues : {':this_userid' : userId }
  };
          // put image up on s3
  return s3.putObject(s3Params).promise()
    // create a record in db
    .then(() => dynamo.put(dbParams).promise())
    // scan for user for current score
    .then(() => dynamo.scan(scanParams).promise())
    // update new score
    .then((res) => {
      const user = res.Items[0];

      if (!user) {
        return null;
      }

      const seasonString = `season${new Date().getFullYear()}${Math.floor(new Date().getMonth() / 3) + 1}`;
      const currentSeasonScore = user[seasonString] || 0;
      const totalScore = user['totalScore'] || 0;
      return dynamo.update({
        Key: { userId },
        TableName: 'TNT-Users',
        ReturnValues: 'ALL_NEW',
        ExpressionAttributeNames: { "#DK": seasonString, "#TS": 'totalScore' },
        ExpressionAttributeValues: { ":d": currentSeasonScore + 1, ":t": totalScore + 1 },
        UpdateExpression: 'SET #DK = :d, #TS = :t'
      }).promise()
    })
    // publish a resize job
    .then(() => publishResizeJobToSQS(dbParams.Item))
    .then(() => {
      console.log('image successfully uploaded to s3, data stored in dynamo');
      callback(null, { success: true })
    })
    .catch((err) => {
      console.log(err.message);
      callback(err);
    });
};

const getDocs = (event) => {
  const { tag, limit, lastKey } = event.queryStringParameters || {};
  let queryGSIParams = {
    "TableName": dynamoTable,
    "IndexName": 'primaryTag-timestamp-index',
    "KeyConditionExpression": "primaryTag = :v_title",
    "ExpressionAttributeValues": {
        ":v_title": tag || '中美斷交'
    },
    "ScanIndexForward": true,
    Limit: 200,
    ExclusiveStartKey: lastKey && JSON.parse(lastKey)
  };


  return dynamo.query(queryGSIParams).promise();
};

const getSingleDoc = (event) => {
  const { uid } = event.queryStringParameters || {};

  const params = {
    TableName: dynamoTable,
    Key: { uid }
  };

  return dynamo.get(params).promise();
}

const deleteDoc = (event, callback) => {
  const { uid } = JSON.parse(event.body);
  const params = {
    TableName : dynamoTable,
    Key: {
      uid
    }
  };

  return dynamo.delete(params).promise();
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
      deleteDoc(event)
      .then(() => done(null, { success: true }))
      .catch(err => done(err))

      break;
    case 'GET':
      const { uid } = event.queryStringParameters || {};
      if (uid) {
        getSingleDoc(event)
        .then(data => done(null, data))
        .catch(err => done(err))
      } else {
        getDocs(event)
        .then(data => done(null, data))
        .catch(err => done(err))
      }

      break;
    case 'POST':
      console.log(event);

      uploadImage(event, done);
      break;
    case 'PUT':
      break;
    default:
      done(new Error(`Unsupported method "${event.httpMethod}"`));
  }
};
