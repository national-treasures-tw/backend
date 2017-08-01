const getType = (message) => {
  const attributes = message.MessageAttributes || {};
  const type = attributes.type && attributes.type.StringValue;

  return type;
};

const getJSONFromMessageResize = (message) => {
  const attributes = message.MessageAttributes || {};
  const uid = attributes.uid && attributes.uid.StringValue;
  const imageKey = attributes.imageKey && attributes.imageKey.StringValue;
  const location = attributes.location && attributes.location.StringValue;
  const docId = attributes.docId && attributes.docId.StringValue;

  return { uid, imageKey, location, docId };
};

const getJSONFromMessageTranslate = (message) => {
  const attributes = message.MessageAttributes || {};
  const uid = attributes.uid && attributes.uid.StringValue;
  const ocr = attributes.ocr && attributes.ocr.StringValue;

  return { uid, ocr };
};
const getJSONFromMessageNLP = (message) => {
  const attributes = message.MessageAttributes || {};
  const uid = attributes.uid && attributes.uid.StringValue;
  const ocr = attributes.ocr && attributes.ocr.StringValue;
  const nlpType = attributes.nlpType && attributes.nlpType.StringValue;

  return { uid, ocr, nlpType };
};

module.exports = {
  getType,
  getJSONFromMessageResize,
  getJSONFromMessageTranslate,
  getJSONFromMessageNLP,
};
