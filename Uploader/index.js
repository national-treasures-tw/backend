const AWS = require('aws-sdk');
const uuidV1 = require('uuid/v1');
const dynamoTable = process.env.TABLE_NAME;
const s3 = new AWS.S3({
  apiVersion: '2006-03-01', // lock in specific version of the SDK
  signatureVersion: 'v4', // S3 requires the "v4" signatureVersion to enable KMS server side encryption
});
const Lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });
const dynamo = new AWS.DynamoDB.DocumentClient();
const originalBucketName = process.env.IMAGE_BUCKET_NAME;
const resizedBucketName = process.env.RESIZED_IMAGE_BUCKET_NAME;
const resizeLambdaFunctionName = process.env.RESIZE_LAMBDA;

// uploads an image
const uploadImage = (event, callback) => {
  const uid = uuidV1();
  const { location } = event.body || 'nara';
  const { docId, email, recordGroup, entry, stack, row, compartment, containerId, timestamp, title, box, shelf } = event.body;
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
      email,
      recordGroup,
      entry,
      stack,
      row,
      compartment,
      containerId,
      timestamp,
      title,
      box,
      shelf,
      ocr: [],
      translate: [],
      nlp: [],
      originalUrl: `https://s3.amazonaws.com/${originalBucketName}/${s3Params.Key}`,
      xsmallUrl: `https://s3.amazonaws.com/${resizedBucketName}/${location}/${docId}/${uid}@xsmall.jpg`,
      smallUrl: `https://s3.amazonaws.com/${resizedBucketName}/${location}/${docId}/${uid}@small.jpg`,
      mediumUrl: `https://s3.amazonaws.com/${resizedBucketName}/${location}/${docId}/${uid}@medium.jpg`,
      largeUrl: `https://s3.amazonaws.com/${resizedBucketName}/${location}/${docId}/${uid}@large.jpg`,
    }
  };

  // For Image Resize Lambda
  const resizeData = {
    uid,
    imageKey: s3Params.Key,
    location,
    docId
  };

  const payload = {
      operation: 'RESIZE_IMAGE',
      data: resizeData,
  };

  const params = {
      FunctionName: resizeLambdaFunctionName,
      InvocationType: 'Event',
      Payload: new Buffer(JSON.stringify(payload)),
  };

  return s3.putObject(s3Params).promise()
    .then(() => dynamo.put(dbParams).promise())
    .then(() => {
      console.log('image successfully uploaded to s3, data stored in dynamo');
      Lambda.invoke(params).promise();
      callback(null, { success: true })
    })
    .catch((err) => {
      console.log(err.message);
      callback(err);
    });
};


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
    case 'GET':
      dynamo.scan({ TableName: dynamoTable }).promise()
      .then(res => done(null, res.Items));

      break;
    case 'POST':
      console.log(event);

      uploadImage(event, callback);
      break;
    case 'PUT':
      break;
    default:
      done(new Error(`Unsupported method "${event.httpMethod}"`));
  }
};
