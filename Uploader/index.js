const AWS = require('aws-sdk');
const uuidV1 = require('uuid/v1');
const sharp = require('sharp');
const dynamoTable = process.env.TABLE_NAME;
const s3 = new AWS.S3({
  apiVersion: '2006-03-01', // lock in specific version of the SDK
  signatureVersion: 'v4', // S3 requires the "v4" signatureVersion to enable KMS server side encryption
});
const dynamo = new AWS.DynamoDB.DocumentClient();
const originalBucketName = process.env.IMAGE_BUCKET_NAME;
const resizedBucketName = process.env.RESIZED_IMAGE_BUCKET_NAME;

// helper to resize images
const sharpResize = (imageBuffer, width) =>
  sharp(imageBuffer)
    .resize(width)
    .toBuffer();

// helper to generate resized images
const generateAvatars = (image) => {
  const size100 = sharpResize(image, 100);
  const size210 = sharpResize(image, 210);
  const size500 = sharpResize(image, 500);
  const size900 = sharpResize(image, 900);

  return Promise.all([size100, size210, size500, size900]);
};

// uploads an image
const uploadImage = (event, callback) => {
  const uid = uuidV1();
  const { location } = event.body || 'nara';
  const { docId, email, recordGroup, entry, stack, row, compartment, containerId, timestamp, title, box, shelf } = event.body;
  const image = new Buffer(event.body.file.replace(/^data:image\/(png|jpeg);base64,/, ''), 'base64');
  const s3Params = {
    Bucket: bucketName,
    Key: `${location}/${docId}/${uid}.jpg`,
    Body: image,
  };

  const resizeAndUpload = () => generateAvatars(image)
    .then([size100, size210, size500, size900] => [
    {
      Bucket: resizedBucketName,
      Key: `${location}/${docId}/${uid}@xsmall.jpg`,
      Body: size100,
    },
    {
      Bucket: resizedBucketName,
      Key: `${location}/${docId}/${uid}@small.jpg`,
      Body: size210,
    },
    {
      Bucket: resizedBucketName,
      Key: `${location}/${docId}/${uid}@medium.jpg`,
      Body: size500,
    },
    {
      Bucket: resizedBucketName,
      Key: `${location}/${docId}/xs-${uid}@large.jpg`,
      Body: size900,
    }
  ])
  .then(resizeS3Params => Promise.all(resizeS3Params.map(param => s3.putObject(param).promise())));

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
            originalUrl: `https://s3.amazonaws.com/${originalBucketName}/${s3Params.Key}`,
            xsmallUrl: `https://s3.amazonaws.com/${resizedBucketName}/${location}/${docId}/${uid}@xsmall.jpg`,
            smallUrl: `https://s3.amazonaws.com/${resizedBucketName}/${location}/${docId}/${uid}@small.jpg`,
            mediumUrl: `https://s3.amazonaws.com/${resizedBucketName}/${location}/${docId}/${uid}@medium.jpg`,
            largeUrl: `https://s3.amazonaws.com/${resizedBucketName}/${location}/${docId}/${uid}@large.jpg`,
        }
    };


  return s3.putObject(s3Params).promise()
    .then(() => dynamo.put(dbParams).promise())
    .then(resizeAndUpload)
    .then(() => {
      console.log('image successfully uploaded to s3, data stored in dynamo and resized');
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
