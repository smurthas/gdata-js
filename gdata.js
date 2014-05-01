var EventEmitter = require('events').EventEmitter;
var https = require('https');
var parse = require('url').parse;
var querystring = require('querystring');
var request = require('request');

var oauthBase = 'https://accounts.google.com/o/oauth2';

function doPost(body, callback) {
  var options = {
    host: 'accounts.google.com',
    port: 443,
    path: '/o/oauth2/token',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  };

  var httpsReq = https.request(options, function (httpsRes) {
    if (httpsRes.statusCode === 200) {
      httpsRes.on('data', function (data) {
        var res;
        try {
          res = JSON.parse(data.toString());
        } catch(err) {
          return callback({
            err: err,
            res: data
          });
        }
        callback(null, res);
      });
    } else {
      httpsRes.on('data', function (data) {
        console.error("refreshing token -- statusCode !== 200, yoikes! data:",
          data.toString());

        callback(data.toString());
      });
    }
  });

  httpsReq.write(querystring.stringify(body));

  httpsReq.on('error', function (e) {
    callback(e, null);
  });

  httpsReq.end();
}

module.exports = function (client_id, client_secret, redirect_uri) {
  var clientID = client_id;
  var clientSecret = client_secret;
  var redirectURI = redirect_uri;
  var token;

  var client = new EventEmitter();

  client.getAccessToken = function (options, req, res, callback) {
    if (req.query.error) {
      callback(req.query.error);
    } else if (!req.query.code) {
      options.client_id = clientID;
      options.redirect_uri = options.redirect_uri || redirectURI;
      options.response_type = 'code';

      var height = 750;
      var width = 980;

      var resp = "<script type='text/javascript'>" +
        "var left= (screen.width / 2) - (" + width + " / 2);" +
        "var top = (screen.height / 2) - (" + height + " / 2);" +
        "window.open('" + oauthBase + '/auth?' +
        querystring.stringify(options) + "', 'auth', 'menubar=no,toolbar=no," +
        "status=no,width=" + width + ",height=" + height +
        ",toolbar=no,left=' + left + 'top=' + top);" +
        "</script>";

      res.end(resp + '<a target=_new href=\'' + oauthBase + '/auth?' +
        querystring.stringify(options) + '\'>Authenticate</a>');
    } else {
      doPost({
        grant_type: 'authorization_code',
        code: req.query.code,
        client_id: clientID,
        client_secret: clientSecret,
        redirect_uri: redirectURI
      }, function (err, tkn) {
        if (!err && tkn && !tkn.error) {
          token = tkn;
        }

        callback(err, tkn);
      });
    }
  };

  client.setToken = function (tkn) {
    token = tkn;
  };

  client.getToken = function() {
    return token;
  };

  client.getFeed = function (url, params, callback) {
    if (!callback && typeof params === 'function') {
      callback = params;
      params = {};
    }

    params.oauth_token = token.access_token;

    // Don't request profile photos as JSON
    if (!/photos\/media/.test(url)) {
      params.alt = 'json';
    }

    doRequest(url, params, function (err, body) {
      callback(err, body);
    });
  };

  client.post = function(options, callback) {
    if (!options.qs) options.qs = {};
    if (!options.qs.access_token) options.qs.access_token = token.access_token;
    request.post(options, function(err, resp, body) {
      if (err) return callback(err, body);
      if (resp.statusCode === 401) {
        return refreshToken(function(err, result) {
          if(!err && result && !result.error && result.access_token) {
            token.access_token = result.access_token;
            token.refresh_token = result.refresh_token || token.refresh_token;
            client.emit('tokenRefresh');
            options.qs.access_token = token.access_token;
            client.post(options, callback);
          }
        });
      }
      return callback(null, body);
    });
  };

  function doRequest(url, params, callback) {
    var parsedUrl = parse(url);
    var path = parsedUrl.pathname + '?' + querystring.stringify(params);

    var options = {
      host: parsedUrl.host || 'www.google.com',
      port: 443,
      path: path,
      method: 'GET'
    };

    var httpsReq = https.request(options, function (httpsRes) {
      if (httpsRes.statusCode === 401 || httpsRes.statusCode === 403) {
        refreshToken(function (err, result) {
          if (err) {
            return callback(err);
          }

          if (result && result.error) {
            return callback(result.error);
          }

          if (!err && result && !result.error && result.access_token) {
            token.access_token = result.access_token;
            token.refresh_token = result.refresh_token || token.refresh_token;

            client.emit('tokenRefresh');

            client.getFeed(url, params, callback);
          }
        });
      } else {
        var data = '';

        httpsRes.on('data', function (moreData) {
          data += moreData;
        });

        httpsRes.on('end', function () {
          // Don't try to parse profile pictures as JSON
          if (httpsRes.headers['content-type'] &&
            httpsRes.headers['content-type'].indexOf('image') === 0) {
            return callback(null, data);
          }

          try {
            callback(null, JSON.parse(data.toString()));
          } catch (err) {
            callback(err + ": " + data.toString(), null);
          }
        });
      }
    });

    httpsReq.on('error', function (e) {
      callback(e, null);
    });

    httpsReq.end();
  }

  function refreshToken(callback) {
    doPost({
      client_id: clientID,
      client_secret: clientSecret,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token'
    }, function (err, result) {
      if (err || !result || !result.access_token) {
        console.error('gdata-js refreshToken err', err);
        console.error('gdata-js refreshToken result', result);
      }

      callback(err, result);
    });
  }

  // for debugging
  client._refreshToken = refreshToken;

  return client;
};
