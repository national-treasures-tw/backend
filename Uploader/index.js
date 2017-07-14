const AWS = require('aws-sdk');
const uuidV1 = require('uuid/v1');
const dynamoTable = process.env.TABLE_NAME;
const s3 = new AWS.S3({
  apiVersion: '2006-03-01', // lock in specific version of the SDK
  signatureVersion: 'v4', // S3 requires the "v4" signatureVersion to enable KMS server side encryption
});
const dynamo = new AWS.DynamoDB.DocumentClient();
const bucketName = process.env.IMAGE_BUCKET_NAME;

// uploads an image
const uploadImage = (event, callback) => {
  const uid = uuidV1();
  const { naId, email, recordGroup, entry, stack, row, compartment, containerId, timestamp, title, box, shelf } = event.body;
  const image = new Buffer(event.body.file.replace(/^data:image\/(png|jpeg);base64,/, ''), 'base64');
  const s3Params = {
    Bucket: bucketName,
    Key: `nara/${naId}/${uid}-${timestamp}.jpg`,
    Body: image,
  };

  const dbParams = {
        TableName: dynamoTable,
        Item: {
            uid,
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
            bucket: bucketName,
            key: s3Params.Key,
        }
    };


  return s3.putObject(s3Params).promise()
    .then(() => dynamo.put(dbParams).promise())
    .then(() => {
      console.log('image successfully uploaded to s3 and data stored in dynamo');
      callback(null, { success: true })
    })
    .catch((err) => {
      console.log(err.message);
      callback(err);
    });
};

const getImage = (key, callback) => {
  // if no params specified, return original size avatar
  const s3Params = {
    Bucket: bucketName,
    Key: key
  };

  // get object and immediately write to request
  s3.getObject(s3Params).promise()
  .then((data) => {
    callback(null, {
      statusCode: '200',
      body: data.Body,
      headers: {
          'Content-Type': 'image/jpeg',
          'Access-Control-Allow-Origin': '*'
      },
    });
  })
  .catch(err => console.log(err));
};

exports.handler = (event, context, callback) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const done = (err, res) => callback(null, {
    statusCode: err ? '400' : '200',
    body: err ? err.message : JSON.stringify(res),
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    },
  });

  const query = event.queryStringParameters;
  // const body = JSON.parse(event.body);

  switch (event.httpMethod) {
    case 'DELETE':

      break;
    case 'GET':
      getImage(query.key, callback);

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
