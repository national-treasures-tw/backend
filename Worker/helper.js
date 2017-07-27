const getType = (message) => {
  const attributes = message.MessageAttributes || {};
  const type = attributes.type && attributes.type.StringValue;

  return type;
};

const respawnMessage = (message, childType) => {
  const { MessageAttributes, Body } = message;
  const MAKeys = Object.keys(MessageAttributes);
  let newMessageAttributes = {};
  MAKeys.forEach((e) => {
    if (e !== 'type') {
      newMessageAttributes[e] = { DataType: MessageAttributes[e].DataType, StringValue: MessageAttributes[e].StringValue }
    } else {
      newMessageAttributes[e] = { DataType: MessageAttributes[e].DataType, StringValue: childType }
    }
  })

  return Object.assign({}, { MessageAttributes: newMessageAttributes, MessageBody: Body }, {
    QueueUrl: process.env.SQS_QUEUE_URL || 'https://sqs.us-east-1.amazonaws.com/143068653284/BPT-DEV',
    DelaySeconds: 0
  });
};

const getJSONFromMessageNewEmployee = (message) => {
  const attributes = message.MessageAttributes || {};
  const email = attributes.email && attributes.email.StringValue;
  const companyId = attributes.companyId && +attributes.companyId.StringValue;
  const employeeId = attributes.employeeId && +attributes.employeeId.StringValue;
  const therapistId = attributes.therapistId && +attributes.therapistId.StringValue;
  const timezone = attributes.timezone ? attributes.timezone.StringValue : 'America/New_York';
  const uid = attributes.uid && attributes.uid.StringValue;

  return { email, companyId, employeeId, therapistId, timezone, uid };
};

module.exports = {
  getType,
  respawnMessage,
  getJSONFromMessageNewEmployee,
};
