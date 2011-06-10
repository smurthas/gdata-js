var querystring = require('querystring');
var request = require('request');
var https = require('https');

var oauthBase = 'https://accounts.google.com/o/oauth2';

module.exports = function(client_id, client_secret, redirect_uri) {
    var clientID = client_id;
    var clientSecret = client_secret;
    var redirectURI = redirect_uri;
    this.getAccessToken = function(scope, req, res, callback) {
        if(req.query.error) {
            callback(req.query.error);
        } else if(!req.query.code) {
            res.redirect(oauthBase + '/auth?' + querystring.stringify({client_id: clientID , 
                                                redirect_uri: redirectURI, 
                                                scope: scope, 
                                                response_type: 'code'}));
        } else {
             doPost({grant_type:'authorization_code',
                      code:req.query.code,
                      client_id:clientID,
                      client_secret:clientSecret,
                      redirect_uri:redirectURI}, function(err, tkn) {
                          callback(err, tkn);
                      });
        }
    }
    
    this.getFeed = function(url, params, callback) {
        if(!callback && typeof params === 'function') {
            callback = params;
            params = {};
        }
        params.alt = 'json';
        var reqUrl = url + '?' + querystring.stringify(params);
        request.get({uri:reqUrl}, function(err, resp, body) {
            if(!err && body) {
                try {
                    body = JSON.parse(body);
                } catch(e) {
                    callback(e, body);
                    return;
                }
                callback(null, body);
            } else {
                callback(err, body);
            }
        });
    }
    return this;
}

function doPost(body, callback) {
    var options = {
        host: 'accounts.google.com',
        port: 443,
        path: '/o/oauth2/token',
        method: 'POST',
        headers: {'Content-Type':'application/x-www-form-urlencoded'}
    };
    var httpsReq = https.request(options, function(httpsRes) {
        httpsRes.on('data', function(data) {
            callback(null, JSON.parse(data));
        });
    });
    httpsReq.write(querystring.stringify(body));
    httpsReq.on('error', function(e) {
        callback(e, null);
    });
    httpsReq.end();
}