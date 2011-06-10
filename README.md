# gdata-js

Simple Google Data API client for OAuth 2.0 with express + connect.

    npm install gdata-js

## Usage

gdata-js has two methods:

* getAccessToken(_req_, _res_, _callback_): Goes through the OAuth 2.0 flow to get an access token
* getFeed(_http_method_, _path_, _params_, _callback_): Does a call to the Google Data API to get a feed object.

oauth\_token must be contained in the _params_ argument as demonstrated in test.js

## Test

Enter your consumer key and secret in test.js

    cd test
    node test.js

open http://localhost:8553