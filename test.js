var request = require('request');
var querystring = require('querystring');
var fs = require('fs');

// get an clientID and clientSecret at https://code.google.com/apis/console/
var gdata = require('./gdata')('yourClientID', 'yourClientSecret', 'http://localhost:8553/')
var scope = 'https://www.google.com/m8/feeds/'; //contacts

var express = require('express'),
    connect = require('connect'),
    app = express.createServer(connect.bodyParser());
    
var token;
app.get('/', function (req, res) {
    gdata.getAccessToken(scope, req, res, function(err, tkn) {
        if(err) {
            console.error('oh noes!', err);
            res.writeHead(500);
            res.end('error: ' + JSON.stringify(err));
        } else {
            token = tkn;
            res.redirect('/getStuff');
        }
    });
});

app.get('/getStuff', function(req, res) {
    getFeed('https://www.google.com/m8/feeds/contacts/default/full', {oauth_token:token.access_token, 'max-results':3},
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

