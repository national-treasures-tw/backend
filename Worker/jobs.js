const {
  getJSONFromMessageResize,
  getJSONFromMessageTranslate,
  getJSONFromMessageNLP,
} = require('./helper.js');


// jobs for a new clinicemployee
const jobs = [
  {
    service: 'Resizer',
    purpose: 'To resize uploaded images',
    type: 'RESIZE_IMAGE',
    getJSON: getJSONFromMessageResize,
    lambda: {
      functionName: process.env.RESIZE_LAMBDA
    },
    isActive: true
  },
  {
    service: 'Translator',
    purpose: 'To translate OCR results',
    type: 'TRANSLATE_OCR',
    getJSON: getJSONFromMessageTranslate,
    lambda: {
      functionName: process.env.TRANSLATE_LAMBDA
    },
    isActive: true
  },
  {
    service: 'NLP',
    purpose: 'To NLP OCR results in EN/ZH',
    type: 'NLP_OCR',
    getJSON: getJSONFromMessageNLP,
    lambda: {
      functionName: process.env.NLP_LAMBDA
    },
    isActive: true
  },
];


module.exports = jobs;
