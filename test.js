var request = require('request');
var querystring = require('querystring');
var fs = require('fs');

var clientID = process.argv[2];
var clientSecret = process.argv[3];

if (! (clientID && clientSecret) ) {
  console.error('usage: node test.js <clientID> <clientSecret>');
  process.exit(1);
}
// get an clientID and clientSecret at https://code.google.com/apis/console/
var gdataClient = require('./gdata')(clientID, clientSecret, 'http://localhost:8553/');
var scope = 'https://www.google.com/m8/feeds/'; //contacts

var express = require('express'),
    connect = require('connect'),
    app = express.createServer(connect.bodyParser());

app.get('/', function (req, res) {
    // see https://developers.google.com/accounts/docs/OAuth2WebServer for options
    gdataClient.getAccessToken({scope: scope,
                                access_type: 'offline',
                                approval_prompt: 'force'}, req, res, function(err, token) {
        if(err) {
            console.error('oh noes!', err);
            res.writeHead(500);
            res.end('error: ' + JSON.stringify(err));
        } else {
            res.redirect('/getStuff');
        }
    });
});

app.get('/getStuff', function(req, res) {
    gdataClient.getFeed('https://www.google.com/m8/feeds/contacts/default/full', {'max-results':3},
    function(err, feed) {
        res.writeHead(200);
        for(var i in feed.feed.entry) {
            res.write(JSON.stringify(feed.feed.entry[i]['title']));
            res.write(JSON.stringify(feed.feed.entry[i]['gd$email']));
            res.write('\n\n')
        }
        res.end();
    });
})

app.listen(8553);
console.log('open http://localhost:8553');

