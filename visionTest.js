var vision = require('@google-cloud/vision')({
  projectId: 'national-treasure-148700',
  keyFilename: '../national-treasure-adff284fabe9.json'
});

var types = [
  'label',
  'text'
];

vision.detect('../IMG_0485.JPG', types, function(err, detections, apiResponse) {
  // detections = {
  //   faces: [...],
  //   labels: [...]
  // }
  console.log(detections);
});