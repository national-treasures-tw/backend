// This is a lambda that retrives user and ranking info (needs to be connected to API gateway)

const AWS = require('aws-sdk');
const decode = require('jwt-decode');
const dynamo = new AWS.DynamoDB.DocumentClient();
const dynamoDB = new AWS.DynamoDB();

// gets the user info
const getUser = (event, callback) => {
  const { token } = event.queryStringParameters;
  let payload;
  try { // decode jwt
    payload = decode(token);
  } catch (e) {
    console.log(e);
  }

  const params = {
    TableName : 'TNT-Users',
    Key: { userId: payload['cognito:username'] }
  };

  let userInfo = {};

  dynamo.get(params).promise()
  .then((result) => {
    if (!result.Item) {
      throw Error('This userId does not exist');
    }

    userInfo.info = result.Item;

    // example seasonString: 'season20173';
    const seasonString = `season${new Date().getFullYear()}${Math.floor(new Date().getMonth() / 3) + 1}`;
    const currentSeasonScore = result.Item[seasonString] || 0;
    // const totalScore = result.Item['totalScore'] || 0;

    // TODO: needs to account for dynamodb pagination (i.e. it scans only part of db in the first go when records are big)
    const seasonRankingParams = {
      TableName : 'TNT-Users',
      FilterExpression : `${seasonString} BETWEEN :min_score AND :max_score`,
      ExpressionAttributeValues : {':max_score' : currentSeasonScore + 10000, ':min_score' : currentSeasonScore - 2000},
      ExpressionAttributeNames: {
       '#NN': 'nickname',
       '#TS': 'totalScore',
       '#S': seasonString,
       '#AU': 'avatarUrl'
      },
      ProjectionExpression: '#NN, #TS, #S, #AU'
    };

    return dynamo.scan(seasonRankingParams).promise()
  })
  .then((data) => {
    userInfo.ranking = data.Items;

    return dynamoDB.describeTable({ TableName: 'TNT-Records'} ).promise();
  })
  .then((description) => {
    userInfo.totalCount = description.Table.ItemCount;
    console.log('user info is compiled');
    callback(null, { success: true, user: userInfo });
  })
  .catch(err => {
    console.log(err);
    callback(err);
  })
};


exports.handler = (event, context, callback) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const done = (err, res) => callback(null, {
    statusCode: err ? '400' : '200',
    body: err ? err.message : JSON.stringify(res),
    headers: {
        ContentType: 'application/json',
        'Access-Control-Allow-Origin': '*'
    },
  });

  // const query = event.queryStringParameters;
  // const body = JSON.parse(event.body);

  switch (event.httpMethod) {
    case 'GET':
      getUser(event, done);
      break;
    case 'POST':

      break;
    case 'PUT':

      break;
    default:
      done(new Error(`Unsupported method "${event.httpMethod}"`));
  }
};
