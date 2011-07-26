var querystring = require('querystring');
var request = require('request');
var https = require('https');
var EventEmitter = require('events').EventEmitter;

var oauthBase = 'https://accounts.google.com/o/oauth2';

module.exports = function(client_id, client_secret, redirect_uri) {
    var clientID = client_id;
    var clientSecret = client_secret;
    var redirectURI = redirect_uri;
    var token;
    
    var client = new EventEmitter();
    client.getAccessToken = function(scope, req, res, callback) {
        if(req.query.error) {
            callback(req.query.error);
        } else if(!req.query.code) {
            var height = 750;
            var width = 980;
            resp = "<script type='text/javascript'>var left= (screen.width / 2) - (" + width + " / 2); var top = (screen.height / 2) - (" + height + " / 2); window.open('" + oauthBase + '/auth?' + querystring.stringify({client_id: clientID, redirect_uri: redirectURI, scope: scope, response_type: 'code'}) + "', 'auth', 'menubar=no,toolbar=no,status=no,width=" + width + ",height=" + height + ",toolbar=no,left=' + left + 'top=' + top);</script>";
            res.end(resp + '<a target=_new href=\'' + oauthBase + '/auth?' + querystring.stringify({client_id: clientID , 
                                                                                    redirect_uri: redirectURI, 
                                                                                    scope: scope, 
                                                                                    response_type: 'code'}) + '\'>Authenticate</a>');
        } else {
             doPost({grant_type:'authorization_code',
                      code:req.query.code,
                      client_id:clientID,
                      client_secret:clientSecret,
                      redirect_uri:redirectURI}, function(err, tkn) {
                          if(!err && tkn && !tkn.error)
                              token = tkn;
                          callback(err, tkn);
                      });
        }
    }
    
    client.setToken = function(tkn) {
        token = tkn;
    }
    client.getFeed = function(url, params, callback) {
        if(!callback && typeof params === 'function') {
            callback = params;
            params = {};
        }
        params.oauth_token = token.access_token;
        params.alt = 'json';
        var reqUrl = url + '?' + querystring.stringify(params);
        request.get({uri:reqUrl}, function(err, resp, body) {
            if(resp.statusCode === 401) {
                console.error('401 baby!!');
                refreshToken(function(err, result) {
                    if(!err && result && !result.error && result.access_token) {
                        token.access_token = result.access_token;
                        client.emit('tokenRefresh');
                        client.getFeed(url, params, callback);
                    }
                });
            } else if(!err && body) {
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
    
    function refreshToken(callback) {
        doPost({client_id:clientID,
                client_secret:clientSecret,
                refresh_token:token.refresh_token,
                grant_type:'refresh_token'
               }, function(err, result) {
                   if(!err && result && result.access_token) {
                       token.access_token
                       result.refresh_token = token.refresh_token;
                   } else {
                       console.error('err', err);
                       console.error('result', result);
                   }
                   callback(err, result);
               });
    }
    return client;
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