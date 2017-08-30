var PDFParser = require('pdf2json');
var pdfParser = new PDFParser();
var PDFImage = require("pdf-image").PDFImage;

// folder name
const folderName = './hsincool'
const pdfName = 'scanbot4.pdf';
const outputName = pdfName.replace('.pdf', '');

var pdfImage = new PDFImage(`${folderName}/${pdfName}`);
var fs = require('fs');

pdfParser.on('pdfParser_dataReady', function(data) {
 var pageNumber = data.formImage.Pages.length;
    console.log('Number of pages:', pageNumber);
 var pages = [...Array(pageNumber).keys()].map(number => {
  return pdfImage.convertPage(number).then(function (imagePath) {
  fs.existsSync(`${folderName}/${outputName}-${number}.png`) // => true
  });
});
return Promise.all(pages).then(res => console.log(res)).catch(err => console.log(err));
});
// pdfParser.on('pdfParser_dataError', _.bind(_onPFBinDataError, self));

pdfParser.loadPDF(`${folderName}/${pdfName}`);
