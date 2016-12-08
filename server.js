//Import dependencies
var express = require('express');
var bodyParser = require('body-parser');
//Create instances
var app = express();
var router = express.Router();

//Set our port to either a predetermined port number if you have set it up, or 3001
var port = process.env.PORT || 3001;
var router = express.Router();
var fs = require('fs');

fs.writeFile('/tmp/key.json', process.env.GOOGLE_KEY, function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The file was saved!");
}); 
// Google Vision API
var vision = require('@google-cloud/vision')({
  projectId: 'national-treasure-148700',
  keyFilename: '/tmp/key.json'
  // credentials: {
  //   client_email: process.env.GOOGLE_CLIENT_EMAIL,
  //   private_key: process.env.GOOGLE_PRIVATE_KEY
  // }
});

//Configure the API to use bodyParser and look for JSON data in the request body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//To prevent errors from Cross Origin Resource Sharing, we will set our headers to allow CORS with middleware like so:
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers');

  //Remove cacheing so we get the most recent topics
  res.setHeader('Cache-Control', 'no-cache');
  next();
});

//Add the /topics route to our /api router
router.route('/vision')
  //Retrieve all topics from the database
  .post(function(req, res) {
    var imageUrl = req.body.imageUrl;
    var types = req.body.types;
    vision.detect(imageUrl, types, function(err, detections, apiResponse) {
      // detections = {
      //   faces: [...],
      //   labels: [...]
      // }
      console.log(detections);
      console.log(err);
      res.send(detections);
    });
  })

app.use(router);



//Starts the server and listens for requests
app.listen(port, function() {
  console.log(`server running on port ${port}`);
});