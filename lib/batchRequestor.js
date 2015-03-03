'use strict';

var headerExtractor = require('./headerExtractor');

module.exports = function (requestor) {
  return function* batchRequestor(requests, baseUrl, headers) {
    var results = {},
        resultsHeaders = {},
        requestsThunks = [],
        i = 0,
        name;

    for (name in requests) {
      requestsThunks[i] = requestor.get(baseUrl + requests[name], headers);
      results[name] = i;
      i++;
    }

    var resultsArray = yield requestsThunks, totalResults = 0;

    for (name in results) {
      results[name] = resultsArray[results[name]];
      if (!results[name]) {
        continue;
      }

      ++totalResults;

      resultsHeaders[name] = headerExtractor.extract(results[name].headers);
    }

    var responseHeaders = headerExtractor.compute(resultsHeaders, totalResults);

    return { body: results, headers: responseHeaders };
  };
};
