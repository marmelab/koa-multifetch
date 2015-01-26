'use strict';

module.exports = function (requestor) {

  return function* batchRequestor(requests, baseUrl, headers) {
    var results = {};
    var requestsThunks = [];
    var i = 0, name;
    for (name in requests) {
      requestsThunks[i] = requestor.get(baseUrl + requests[name], headers);
      results[name] = i;
      i++;
    }

    var resultsArray = yield requestsThunks;

    for (name in results) {
      results[name] = resultsArray[results[name]];
    }

    return results;
  };
};
