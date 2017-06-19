'use strict';
// TNT-OCR Lambda function v1
// Google Vision API https://googlecloudplatform.github.io/google-cloud-node/#/docs/vision/0.11.0/vision
const vision = require('@google-cloud/vision')({
  projectId: process.env.PROJECT_ID,
  keyFilename: process.env.KEY_NAME
});
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  apiVersion: '2006-03-01', // lock in specific version of the SDK
  signatureVersion: 'v4', // S3 requires the "v4" signatureVersion to enable KMS server side encryption
});
const bucketName = process.env.IMAGE_BUCKET_NAME;

const getOCR = (event, callback) => {
  const imageKey = event.Records[0].s3.object.key;
  if (imageKey.includes('.jpg') || event.key.include('.png')) {
    const s3Params = {
      Bucket: bucketName,
      Key: imageKey
    };
    console.log(s3Params);
    s3.getObject(s3Params).promise()
    .then((data) => {
      console.log(data);
      vision.detectText(data.Body, function(err, detections) {
        if (err) {
          console.log('error');
          console.log(err);
        }
        console.log('no error');
        console.log(detections);
        callback(null, detections);
      });
    })
  } else {
    console.log('new S3 object is not an image! No OCR for you');
  }
};

// callback(err, result);
exports.handler = (event, context, callback) => {
  try {
      getOCR(event, callback);
  } catch (err) {
      callback(err);
  }
};
