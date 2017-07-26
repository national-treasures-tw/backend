'use strict';
// TNT-OCR Lambda function v1
// Google Vision API https://googlecloudplatform.github.io/google-cloud-node/#/docs/vision/0.11.0/vision
const Language = require('@google-cloud/language')({
  projectId: process.env.PROJECT_ID,
  keyFilename: process.env.KEY_NAME
});
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  apiVersion: '2006-03-01', // lock in specific version of the SDK
  signatureVersion: 'v4', // S3 requires the "v4" signatureVersion to enable KMS server side encryption
});
const dynamo = new AWS.DynamoDB.DocumentClient();
const dynamoTable = process.env.TABLE_NAME;

const getLanguage = (data, callback) => {
  const { ocr, uid } = data;
  const text = ocr[0];
  const document = Language.document({ content: text });

  document.detectEntities()
  .then((results) => {
    console.log(results);
    return dynamo.update({
      Key: { uid },
      TableName: dynamoTable,
      ReturnValues: 'ALL_NEW',
      ExpressionAttributeNames: { "#DK": 'nlp' },
      ExpressionAttributeValues: { ":d": results },
      UpdateExpression: 'SET #DK = :d'
    }).promise()
  })
  .then(() => callback(null, { success: true }))
  .catch(err => callback(err));

};

// callback(err, result);
exports.handler = (event, context, callback) => {
  try {
    if (event.operation === 'NLP_OCR') {
      // invoked by poller
      getLanguage(event.data, callback);
    } else {
      callback('Error: wrong invoker type.');
    }
  } catch (err) {
    callback(err);
  }
};
