const {
  getJSONForResizeImage,
  getJSONForTranlate,
  getJSONForNLPEn,
  getJSONForNLPZh
} = require('./helper.js');


// jobs for a new clinicemployee
const jobs = [
  {
    service: 'Resizer',
    purpose: 'To resize uploaded images',
    type: 'RESIZE_IMAGE',
    getJSON: getJSONForResizeImage,
    lambda: {
      functionName: process.env.RESIZE_LAMBDA
    },
    isActive: true
  },
  {
    service: 'Translator',
    purpose: 'To translate OCR results',
    type: 'TRANSLATE_OCR',
    getJSON: getJSONForTranlate,
    lambda: {
      functionName: process.env.TRANSLATE_LAMBDA
    },
    isActive: true
  },
  {
    service: 'NLP-EN',
    purpose: 'To NLP OCR results in English',
    type: 'NLP_OCR_EN',
    getJSON: getJSONForNLPEn,
    lambda: {
      functionName: process.env.NLP_LAMBDA
    },
    isActive: true
  },
  {
    service: 'NLP-ZH',
    purpose: 'To NLP OCR results in Mandarin',
    type: 'NLP_OCR_ZH',
    getJSON: getJSONForNLPZh,
    lambda: {
      functionName: process.env.NLP_LAMBDA
    },
    isActive: true
  },
];


module.exports = jobs;
