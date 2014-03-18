/* HTTP & HTTPS init */
var fs = require('fs');
var http = require('http');
var https = require('https');
var privateKey  = fs.readFileSync('privatekey.pem').toString();
var certificate = fs.readFileSync('certificate.pem').toString();
var credentials = {key: privateKey, cert: certificate};

/* COMMON init */
var express = require('express'),
	path = require('path'),
	routes = require('./routes'),
	api = require('./routes/api'),
	app = express();

app.set('port', process.env.PORT || 80);
app.set('views', __dirname + '/views');

app.use(express.favicon(__dirname + '/public/favicon.ico'));

//Routes
app.get('/', routes.app);
app.get('/app', routes.app);
app.get('/app/*', routes.app);
app.get('/frame', routes.app);
app.get('/frame/*', routes.app);

//Api
app.get('/api/charts', api.getCharts);
app.get('/api/charts/:id', api.getTracks);

app.use(express.static(path.join(__dirname, 'public')));
var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

//Start
mongodb = require('mongodb');
mongodb.MongoClient.connect('mongodb://127.0.0.1:27017/db', function(err,clientDb) {
	if(err) throw err;
	db=clientDb;
	db.authenticate("login", "password", function(err) {
		if(err) throw err;

		httpServer.listen(80);
		httpsServer.listen(443);
	});
});