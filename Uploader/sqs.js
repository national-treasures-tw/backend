const AWS = require('aws-sdk');
const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

// result = {
//   employeeId: INTEGER,
//   original: STRING,
//   small: STRING,
//   large: STRING,
// };

const getSQSParamsFromResizeJob = (data) => {
  const params = {
    MessageBody: `New image ID-${data.uid} was just uploaded!`,
    QueueUrl: process.env.SQS_QUEUE_URL,
    DelaySeconds: 0,
    MessageAttributes: {
      type: {
        DataType: 'String',
        StringValue: 'RESIZE_IMAGE'
      },
      uid: {
        DataType: 'String',
        StringValue: data.uid
      },
      imageKey: {
        DataType: 'String',
        StringValue: data.imageKey
      },
      location: {
        DataType: 'String',
        StringValue: data.location
      },
      docId: {
        DataType: 'String',
        StringValue: data.docId
      }
    },
  };
  return params;
};

const publishResizeJobToSQS = (data) => {
  const params = getSQSParamsFromResizeJob(data);
  return sqs.sendMessage(params).promise();
};

module.exports = {
  publishResizeJobToSQS
};
