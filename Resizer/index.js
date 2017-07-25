const AWS = require('aws-sdk');
const sharp = require('sharp');
const s3 = new AWS.S3({
  apiVersion: '2006-03-01', // lock in specific version of the SDK
  signatureVersion: 'v4', // S3 requires the "v4" signatureVersion to enable KMS server side encryption
});
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

// resizes an image
const resizeImage = (data, callback) => {
  const { uid, imageKey, location, docId } = data;

  const s3Params = {
    Bucket: originalBucketName,
    Key: imageKey
  };

  const resizeAndUpload = () => s3.getObject(s3Params).promise()
  .then(data => generateAvatars(data.Body))
  .then(([size100, size210, size500, size900]) => [
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
    }
  ])
  .then(resizeS3Params => Promise.all(resizeS3Params.map(param => s3.putObject(param).promise())));

  return resizeAndUpload()
    .then(() => {
      console.log('image successfully resized');
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
