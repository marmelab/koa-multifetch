module.exports = function (superagent) {

  // co compatible thunk with node style callback
  var getUrl = function (url, headers) {
    return function (cb) {

      var request = superagent.get(url)
        .on('error', function (error) {
          // throw error;
          cb(error);
        });

      for(var name in headers) {
        request.set(name, headers[name]);
      }

      request.end(function (res) {
        // return res;
        cb(null, res);
      });
    }
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
          break;
        default:
        throw error;
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
}
