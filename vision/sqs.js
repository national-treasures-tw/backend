const AWS = require('aws-sdk');
const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

// result = {
//   employeeId: INTEGER,
//   original: STRING,
//   small: STRING,
//   large: STRING,
// };

const getSQSParamsFromTranslateJob = (data) => {
  const params = {
    MessageBody: `Requesting Translate For image ID-${data.uid}!`,
    QueueUrl: process.env.SQS_QUEUE_URL,
    DelaySeconds: 0,
    MessageAttributes: {
      type: {
        DataType: 'String',
        StringValue: 'TRANSLATE_OCR'
      },
      ocr: {
        DataType: 'String',
        StringValue: data.ocr
      },
      uid: {
        DataType: 'String',
        StringValue: data.uid
      },
    },
  };
  return params;
};

const publishTranslateJobToSQS = (data) => {
  const params = getSQSParamsFromTranslateJob(data);
  return sqs.sendMessage(params).promise();
};

const getSQSParamsFromNLPEnglishJob = (data) => {
  const params = {
    MessageBody: `Requesting NLP English For image ID-${data.uid}!`,
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
        StringValue: 'nlpEn'
      }
    },
  };
  return params;
};

const publishNLPEnglishJobToSQS = (data) => {
  const params = getSQSParamsFromNLPEnglishJob(data);
  return sqs.sendMessage(params).promise();
};

module.exports = {
  publishTranslateJobToSQS,
  publishNLPEnglishJobToSQS
};
