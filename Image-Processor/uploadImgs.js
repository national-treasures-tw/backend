var fs = require('fs')
var axios = require('axios');

const folderName = './hsincool';

fs.readdir(folderName, (err, files) => {
	const promises = files.filter(name => name.includes('png')).map(name => new Promise((resolve, reject) => {
		fs.readFile(`${folderName}/${name}`, (err, data) => {
			if (err) {
				reject(err);
			}
			const base64Img = data.toString('base64');
                    const upload = () => axios.post(
                    'https://76k76zdzzl.execute-api.us-east-1.amazonaws.com/stage/upload',
                    { file: base64Img,
                      email: 'shinsonh@gmail.com',
                      docId: '2813719',
                      location: 'NARA',
                      userId: '1fcaca0e-83c3-45a8-8e20-806bd3c13047',
                      dispatchId: null,
                      metadata: {
                        NAID: '2813719',
                        recordGroup: '469',
                          entry: 'P 28',
                          stack: '250',
                          row: '064',
                          compartment: '009',
                          shelf: '01-04',
                          box: '1-22',
                          containerId: 'n/a',
                          title: 'Taiwan Investment Center Work Folder \nSeries: Subject Files of James M. Silberman, 1959 - 1960 \nRecord Group 469: Records of U.S. Foreign Assistance Agencies, 1942 - 1963'
                      },
                      timestamp: new Date().getTime(),
                    },
                    { headers: { 'Content-Type': 'application/json' } })
                  .then((res) => {
                    console.log(`uploading ${name} is a success`);
	       resolve('success');
                  })
                  .catch((err) => {
                    //console.error(err);
                    console.log(`upload failed for ${name}`);
                    console.log(err.message);
                  });

                  setTimeout(upload, Math.random() * 170000);
             })
}));

	return Promise.all(promises).then(() => console.log('all done')).catch(err => console.log(err));
})
