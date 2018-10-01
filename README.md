# Taiwan National Treasure Backend

## Components

- AWS Lambda: most backend services are deployed as individual lambda functions
- AWS API Gateway: provides endpoints to connect to lambda functions
- AWS DynamoDB: main (NoSQL) database
- AWS S3: storage of images
- AWS SQS: message queue
- AWS ElasticSearch (Planned for 2017 Winter)
- AWS Machine Leaning (Planned for 2017 Winter)

## 3rd Party services

GCP = Google Cloud Platform

- GCP Vision API: for OCR from images
- GCP Translate API: to translate OCR results from En -> Zh-TW
- GCP Natural Language API: to extract entities from both EN/Zh-TW texts


## Backend services

1. ImageUpload
  - After getting the base64 image posted to the API Gateway endpoint, *ImageUpload* service saves it in S3 and creates a record in DynamoDB. It also sends a message to SQS requesting image resizing.

2. ImageResizer
  - After picking up the image resizing request message from SQS, this service gets the original image from S3 and resizes them, updating the database with resized image urls.

3. Vision
  - Whenever a new image is inserted into S3, the bucket is configured to trigger this service, which requests OCR results from Google Vision API, and sends translation & NLP-English (Natural Language Processing) requests to SQS.

4. Translate
  - After picking up the translate request message from SQS, this service requests Google Translate API with English OCR results, updating the database with the translation text. Then it sends a NLP-ZH-TW request to SQS.  

5. NLP
  - After picking up the NLP request message from SQS, this service requests Google NLP API, updating the database with the entities list. These may be English or Zh-Tw entities depending upon request.


## To set up dev environment

- Sign up on both AWS and GCP
- Get GCP credentials (a key json file) and project ID
- Create your lambda functions, with the following caveat
  - Set the env variables relating to GCP for Vision, Translate, NLP services for your lambdas
  - Normally to deploy to a lambda function you `npm install`, `zip` everything and upload to the lambda function
  - However, for `ImageResizer`, `Vision` and `NLP` there's a build step after `npm install`, and it won't build correctly if you build locally on your Mac or Windows machines.
  - So, you need to either 1) build it inside a docker container with Amazon Machine Image (AMI) Linux or 2) build it on a AMI Linux EC2 instance. If this is too complex, ask this repo author (join@nltr.tw) for zipped `node_modules` files with the correct built files.

## Future plans

- Set up ElasticSearch to index all OCR, translate and NLP results.
- Set up Machine Learning to better understand the classification and categorization relationship between documents, or to help recommend documents for users to browse.

## License
Open Source
MIT  
