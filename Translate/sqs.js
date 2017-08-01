const AWS = require('aws-sdk');
const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

// result = {
//   employeeId: INTEGER,
//   original: STRING,
//   small: STRING,
//   large: STRING,
// };

const getSQSParamsFromNLPZhTWJob = (data) => {
  const params = {
    MessageBody: `Requesting NLP Zh-TW For image ID-${data.uid}!`,
    QueueUrl: process.env.SQS_QUEUE_URL,
    DelaySeconds: 0,
    MessageAttributes: {
      type: {
        DataType: 'String',
        StringValue: 'NLP_OCR'
      },
      ocr: {
        DataType: 'String',
        StringValue: data.ocr
      },
      uid: {
        DataType: 'String',
        StringValue: data.uid
      },
      nlpType: {
        DataType: 'String',
        StringValue: 'nlpZh'
      }
    },
  };
  return params;
};

const publishNLPZhTWJobToSQS = (data) => {
  const params = getSQSParamsFromNLPZhTWJob(data);
  return sqs.sendMessage(params).promise();
};

module.exports = {
  publishNLPZhTWJobToSQS
};
