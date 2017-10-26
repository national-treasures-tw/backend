const AWS = require('aws-sdk');
const sharp = require('sharp');
const s3 = new AWS.S3({
  apiVersion: '2006-03-01', // lock in specific version of the SDK
  signatureVersion: 'v4', // S3 requires the "v4" signatureVersion to enable KMS server side encryption
});
const dynamo = new AWS.DynamoDB.DocumentClient();
const originalBucketName = process.env.IMAGE_BUCKET_NAME;
const resizedBucketName = process.env.RESIZED_IMAGE_BUCKET_NAME;
const dynamoTable = process.env.TABLE_NAME;


// helper to resize images
const sharpResize = (imageBuffer, width) => {
  const img = sharp(imageBuffer);
  return img
  .metadata()
  .then(metadata => {
      if (metadata.width > metadata.height) {
        return img
          .rotate(90)
          .resize(width)
          .toBuffer();
      } else {
        return img
          .resize(width)
          .toBuffer();
      }
  })
}

// helper to generate resized images
const generateAvatars = (image) => {
  const size100 = sharpResize(image, 100);
  const size210 = sharpResize(image, 210);
  const size500 = sharpResize(image, 500);
  const size900 = sharpResize(image, 900);
  const size1600 = sharpResize(image, 1600);

  return Promise.all([size100, size210, size500, size900, size1600]);
};

// resizes an image
const resizeImage = (data, callback) => {
  const { uid, imageKey, location, docId } = data;

  const s3Params = {
    Bucket: originalBucketName,
    Key: imageKey
  };

  const resizeAndUpload = () => s3.getObject(s3Params).promise()
  .then(data => generateAvatars(data.Body))
  .then(([size100, size210, size500, size900, size1600]) => [
    {
      Bucket: resizedBucketName,
      Key: `${location}/${docId}/${uid}@xsmall.jpg`,
      Body: size100,
      ContentType: 'image/jpeg'
    },
    {
      Bucket: resizedBucketName,
      Key: `${location}/${docId}/${uid}@small.jpg`,
      Body: size210,
      ContentType: 'image/jpeg'
    },
    {
      Bucket: resizedBucketName,
      Key: `${location}/${docId}/${uid}@medium.jpg`,
      Body: size500,
      ContentType: 'image/jpeg'
    },
    {
      Bucket: resizedBucketName,
      Key: `${location}/${docId}/${uid}@large.jpg`,
      Body: size900,
      ContentType: 'image/jpeg'
    },
    {
      Bucket: resizedBucketName,
      Key: `${location}/${docId}/${uid}@xlarge.jpg`,
      Body: size1600,
      ContentType: 'image/jpeg'
    }
  ])
  .then(resizeS3Params => Promise.all(resizeS3Params.map(param => s3.putObject(param).promise())));

  const resizedUrls = {
    xsmallUrl: `https://s3.amazonaws.com/${resizedBucketName}/${location}/${docId}/${uid}@xsmall.jpg`,
    smallUrl: `https://s3.amazonaws.com/${resizedBucketName}/${location}/${docId}/${uid}@small.jpg`,
    mediumUrl: `https://s3.amazonaws.com/${resizedBucketName}/${location}/${docId}/${uid}@medium.jpg`,
    largeUrl: `https://s3.amazonaws.com/${resizedBucketName}/${location}/${docId}/${uid}@large.jpg`,
    xlargeUrl: `https://s3.amazonaws.com/${resizedBucketName}/${location}/${docId}/${uid}@xlarge.jpg`,
  };

  const dbUpdateParam = {
    Key: { uid },
    TableName: dynamoTable,
    ReturnValues: 'ALL_NEW',
    ExpressionAttributeNames: { "#DK": 'resizedUrls' },
    ExpressionAttributeValues: { ":d": resizedUrls },
    UpdateExpression: 'SET #DK = :d'
  };

  return resizeAndUpload()
    .then(() => dynamo.update(dbUpdateParam).promise())
    .then(() => {
      console.log('image successfully resized and table updated');
      callback(null, { success: true })
    })
    .catch((err) => {
      console.log(err.message);
      callback(err);
    });
};


exports.handler = (event, context, callback) => {
  try {
    if (event.operation === 'RESIZE_IMAGE') {
      // invoked by poller
      resizeImage(event.data, callback);
    } else {
      callback('Error: wrong invoker type.');
    }
  } catch (err) {
    callback(err);
  }
};
