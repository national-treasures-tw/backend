'use strict';
// TNT-Translate Lambda function v1
// Google Translate API https://cloud.google.com/translate/docs/reference/libraries
const Translate = require('@google-cloud/translate')({
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

const getTranslation = (data, callback) => {
  const { ocr, uid } = data;
  const text = ocr[0];
  const target = 'zh-TW';

  Translate.translate(text, target)
  .then((results) => {
    console.log(results);
    return dynamo.update({
      Key: { uid },
      TableName: dynamoTable,
      ReturnValues: 'ALL_NEW',
      ExpressionAttributeNames: { "#DK": 'translate' },
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
    if (event.operation === 'TRANSLATE_OCR') {
      // invoked by poller
      getTranslation(event.data, callback);
    } else {
      callback('Error: wrong invoker type.');
    }
  } catch (err) {
    callback(err);
  }
};
