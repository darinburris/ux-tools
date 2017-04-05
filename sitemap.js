var SitemapGenerator = require('sitemap-generator'),
	ampConfig = require('./amp-config.json'),
	request = require('request'),
	fs = require('fs'),
	fse = require('fs-extra'),
	cheerio = require('cheerio'),
	chalk = require('chalk'),
	nodePath = require('path'),
	xl = require('excel4node'),
	json2csv = require('json2csv'),
	excelbuilder = require('msexcel-builder'),
	Excel = require('exceljs'),
	argv = require('yargs').argv,
	domainProvided = argv.domain,
	output,
	fileName,
	path,
	xml2js = require('xml2js'),
	parser = new xml2js.Parser(),
	moment = require('moment'),
	msToTime = require('./msToTime'),
	startTimer;

	if(
		((domainProvided === true) && (domainProvided.length === undefined))
		||
		((typeof domainProvided === 'undefined') || (domainProvided.length === 0))
	){
		console.log(chalk.white.bold.bgRed('ERROR: Please provide a url'));
		return;
	}

	const getDomain = require('./getDomain');
	domain = getDomain(domainProvided);

var wb = new xl.Workbook(),
	ws = wb.addWorksheet('Page Titles'),
	xlstyle = wb.createStyle(
		{
			font: {
				color: '#FF0800',
				size: 12
			},
			numberFormat: '$#,##0.00; ($#,##0.00); -'
		}
	);

var workbook = excelbuilder.createWorkbook('./', 'sample.xlsx');
var sheet1 = workbook.createSheet('Titles', 1, 1);

var workbook = new Excel.Workbook();
var sheet = workbook.addWorksheet('My Sheet');

// create generator
var generator = new SitemapGenerator(argv.domain);

generator.on(
	'fetch',
	function (status, url) {
		if(status === 'OK'){
			console.log('fetching: ',url, ' - status: ',chalk.white.bold.bgGreen(' ',status,' '));
		} else {
			console.log('fetching: ',url, ' - status: ',chalk.white.bold.bgRed(' ',status,' '));
		}
	}
);

// register event listeners
generator.on(
	'done',
	function (sitemap) {

		path = ampConfig.quality.reportsDir + '/' + domain + '/sitemap/';

		fse.ensureDir(
			path,
			/*
			 * PURPOSE : Autogenerates function contract comments
			 *  PARAMS : err -
			 * RETURNS : 			funct -
			 *   NOTES :
			 */
			function (err) {

				fileName = path + '/' + fileName;
				fs.writeFileSync(fileName, sitemap);
				convertXML(fileName);

			}
		)

	}

);

generator.on('clienterror',
	function (queueError, errorData) {
		console.log(queueError,errorData);
	}
);

/*
 * PURPOSE : Takes xml sitemap generated by sitemapgenerator and converts it to JSON
 *  PARAMS : fileName - the xml sitemap file
 * RETURNS : function - JSON file replacement
 *   NOTES :
 */
function convertXML(fileName){

	var currPath = nodePath.dirname(fileName);

	fs.readFile(fileName,

		function(err, data) {

			parser.parseString(data,

				function (err, result) {

					var output = JSON.stringify(result);
					var urlArray = [];
					for(loc in result.urlset.url){
						urlArray.push('\'' + result.urlset.url[loc].loc[0] + '\'');
					}
					fs.writeFileSync(currPath + '/' + domain + '.js', 'module.exports = [' + urlArray + ']');
					fs.unlinkSync(fileName);
					console.log(chalk.green.bold('Done writing file'));
					var endTimer = new Date() - startTimer;
					console.log('Execution time: ',chalk.black.bold.bgWhite(msToTime(endTimer)));
					createXLSX(domain);
				}
			);
		}
	);

}

function createXLSX(domain){
	const siteMapPath = './reports/' + domain + '/sitemap/' + domain + '.js';
	const sitemap = require(siteMapPath);
	let counter = 1;
	let titles = new Array;
	let fields = ['titles'];

	let writerStream = fs.createWriteStream(domain + '.csv');
	writerStream.write('Page Titles\n','UTF8');

	//iterator goes here with sitemap as the object
	sitemap.forEach(
		function (value, i) {


			request(value,
				function (error, response, html) {
					if (!error && response.statusCode == 200) {
						var $ = cheerio.load(html);
						var title = $('title').text();
						writerStream.write(title + '\n','UTF8');

						if(counter > sitemap.length){

							writerStream.end();

						}

					}
				}
			);

		}
	);

}

const start = function(){

	//set timer
	startTimer = new Date();
	// start the crawler
	generator.start();

}

start();
