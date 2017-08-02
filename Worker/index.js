/*
TNT Worker Lambda function

It is to be triggered every interval (1 min or less) to poll SQS queue for job messages
Upon receiving a message, this worker invokes corresponding lambda functions based on 'type' of message
and sends neccessary data.

Currently the jobs are
1. Image-Uploader requests resize of uploaded images
2. OCR requests translation for OCR results
3. OCR requests NLP in English for OCR results
4. Translate requests NLP for Zh-TW OCR results

Note: OCR is not invoked by this worker, instead it is invoked by a new upload event by S3
*/
const AWS = require('aws-sdk');
const SQS = new AWS.SQS({ apiVersion: '2012-11-05' });
const Lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });
const { getType } = require('./helper.js');
const { SQS_QUEUE_URL, MESSAGE_ATTRIBUTE_NAMES } = require('./constants.js');
const jobs = require('./jobs.js');

// callback /
const cb = (err, result) => {
  if (err) {
    console.log(err);
  }
  if (result) {
    console.log(result);
  }
};

// for deleting message after done
const deleteSQSMessage = (msg, callback) => {
  console.log('deleting message...');
    const params = {
        QueueUrl: SQS_QUEUE_URL,
        ReceiptHandle: msg.ReceiptHandle,
    };
    SQS.deleteMessage(params, (err) => {
       const comment = ' Message was successfully processed and deleted'
       return callback(err, comment)
   });
};

const invokeLambda = (service, message, callback) => {
  const data = service.getJSON(message);
  console.log(data);
  const payload = {
      operation: service.type,
      data,
  };
  const params = {
      FunctionName: service.lambda.functionName,
      InvocationType: 'Event',
      Payload: new Buffer(JSON.stringify(payload)),
  };
  return Lambda.invoke(params).promise()
    .then(res => {
      console.log(res);
      if (res.StatusCode === 202) {
        deleteSQSMessage(message, callback);
      } else {
        callback(res);
      }
    })
    .catch(err => callback(err.message));
};

const processMessage = (message, callback) => {
    const type = getType(message);

    // if job has { lambda: {...}} then invoke lambda, otherwise request sync from relevant services
    const filteredJobsPromise = jobs
      .filter(job => job.type === type && job.isActive)
      .map(service => invokeLambda(service, message, callback));

    return Promise.all(filteredJobsPromise);
};

const poll = (callback) => {
    const params = {
        QueueUrl: SQS_QUEUE_URL,
        MaxNumberOfMessages: 10,
        VisibilityTimeout: 40,
        MessageAttributeNames: MESSAGE_ATTRIBUTE_NAMES,
    };
    // batch request messages
    console.log('Cranking...');
    return SQS.receiveMessage(params).promise().then((data) => {
        // for each message, reinvoke the function
        if (data.Messages && data.Messages.length > 0) {
            const promises = data.Messages.map((message) => processMessage(message, callback));
            // complete when all messages have been processed
            Promise.all(promises).then(() => {
                const result = ` Messages received: ${data.Messages.length}`;
                console.log(result);
                callback(null, result);
            })
        } else {
            const result = ' No more messages';
            console.log(result);
            callback(null, result);
        }
    })
    .catch(err => callback(err));
}

exports.handler = (event, context, callback) => {
    try {
      // invoked by scheduler
      poll(callback);
    } catch (err) {
      callback(err);
    }
};
