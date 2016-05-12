var request = require('superagent');

module.exports = function (superagent) {

  // co compatible thunk with node style callback
  var getUrl = function (url, headers) {
    return function (cb) {
      request.get(url)
        .set(headers)
        .end(cb);
    };
  };

  function* get(url, headers) {

    headers = headers || {};
    try {
      var response = yield getUrl(url, headers);
    } catch (error) {
      switch(error.code) {
        case 'ENOTFOUND':
          return {
            code: 404,
          };
        case 'ECONNREFUSED':
          return {
            code: 403,
          };
        default:
          return {
            code: 500,
            body: error.code + ': ' + error.message
          };
      }
    }

    if (response.code) {
      return response;
    }

    var result = {
      code: response.status,
      headers: [],
      body: response.body
    };
    for(var name in response.headers) {
      if (!response.headers.hasOwnProperty(name)) {
        continue;
      }
      result.headers.push({
        name: name,
        value: response.headers[name]
      });
    }

    return result;
  }

  return {
    get: get
  };
};
