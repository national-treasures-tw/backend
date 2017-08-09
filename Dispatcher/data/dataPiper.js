/* Script to convert .csv to .json */
// ===================================
// var Converter = require("csvtojson").Converter;
// var converter = new Converter({});
// var fs = require('fs');
//
// //end_parsed will be emitted once parsing finished
// converter.on("end_parsed", function (jsonArray) {
//    // console.log(jsonArray); //here is your result jsonarray
//    var outputFilename = 'NAID_Fang080817.json';
//
// 	fs.writeFile(outputFilename, JSON.stringify(jsonArray), function(err) {
// 	    if(err) {
// 	      console.log(err);
// 	    } else {
// 	      console.log("JSON saved to " + outputFilename);
// 	    }
// 	});
// });
//
// //read from file
// fs.createReadStream("./data/NAID_Fang080817.csv").pipe(converter);


/* Script for picking out records to put in TNT-Catalog AWS DynamoDB table */
// ===================================
const _ = require('lodash');
const uuidV1 = require('uuid/v1');
const data = require('./NAID_Fang080817.json');
const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const dynamoTable = process.env.TABLE_NAME;
const dynamo = new AWS.DynamoDB.DocumentClient();

const filtered = data
	.filter(e => !!e['篩選（翻拍時間估計：箱/2hr']['）'])
	.filter(e => !e['篩選（翻拍時間估計：箱/2hr']['）'].includes('http'))
	.filter(f => !f['篩選（翻拍時間估計：箱/2hr']['）'].includes('篩選'))
	.filter((e, index) =>  index > 2);

const breakBox = (boxNumberString) => {
	const breakBoxRange = (boxRangeString) => {
		// example boxRangeString is '/n1-5'
		if (boxRangeString.includes('-')) {
			const boxRangeArray = boxRangeString.replace('\n', '').replace('A', '').split('-');
			const boxNumberDifference = boxRangeArray[1] - boxRangeArray[0];
			return [...Array(boxNumberDifference + 1).keys()].map(e => e + +boxRangeArray[0]);
		}
		return [+boxRangeString];
	};

	if (boxNumberString.includes(',') && boxNumberString.includes('-')) {
		const boxPreliminaryArray = boxNumberString.split(',');
		return _.flatten(boxPreliminaryArray.map(e => breakBoxRange(e)));
	} else if (boxNumberString.includes('-')) {
		return breakBoxRange(boxNumberString);
	}

	return boxNumberString.split(',').map(e => +e);
}

const assembleBox = (element) => {
	const boxArray = element.boxRange;
	const finalArrayLength = Math.ceil(boxArray.length / 2);
	const boxRange = e => [boxArray[e * 2], boxArray[(e * 2) +1 ]];
	const box = e => boxArray[(e * 2) +1 ] ? boxRange(e).join('-') : `${boxArray[e * 2]}`;
	return [...Array(finalArrayLength).keys()].map(e => (Object.assign({}, element, {
		uid: uuidV1(),
		seriesId: element.FOIA ? element.FOIA : '',
		NAID: element.NAID ? element.NAID : element.FOIA,
		boxRangeString: box(e),
		boxRange: boxRange(e),
		parentBoxRange: element.Box,
		remark: element['篩選（翻拍時間估計：箱/2hr']['）']
	})));
}

const modifiedData = _.flatten(filtered.map(e => Object.assign({}, e, { boxRange: breakBox(e.Box) })).map(e => assembleBox(e)));

modifiedData.forEach(e => {
	delete e['篩選（翻拍時間估計：箱/2hr'];
	delete e.FOIA;
	delete e.Box;
});

const dynamoParams = modifiedData.map(e => (
	{
		PutRequest: {
			Item: {
				uid: e.uid,
				seriesId: e.seriesId || null,
				NAID: e.NAID || null,
				RGN: e.RGN || null,
				isMilitary: !!e['Civilian\n/Miliatry'],
				EN: e.EN || null,
				StackArea: e['Stack Area'] || null,
				Row: e.Row || null,
				Compartment: e.Compartment || null,
				Shelf: e.Shelf || null,
				Title: e.Title || null,
				remark: e.remark || null,
				Type: e.Type ? e.Type : 'None',
				Note: e.Note ? e.Note : 'None',
				boxRange: e.boxRange || [],
				boxRangeString: e.boxRangeString || null,
				parentBoxRange: e.parentBoxRange || null
			}
		}
	}
));

// chunk here for AWS dynamodb batchWrite can only take 25 items at a time
const chunkedParas = _.chunk(dynamoParams, 25);

const chunkedPromises = chunkedParas.map((chunk) => {
	const params = {
		RequestItems: {
			'TNT-Catalog': chunk
		}
	};
	return dynamo.batchWrite(params).promise();
});

Promise.all(chunkedPromises)
.then(res => console.log(res))
.catch(err => console.log(err))
