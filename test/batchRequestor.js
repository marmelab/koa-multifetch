var assert = require('chai').assert;
var co = require('co');

describe('batchRequestor', function () {
  var mockRequestor, batchRequestor;

  beforeEach(function () {
    mockRequestor = {
      get: function* (url, headers) {
        this.getCall++;
        this.headers = headers;

        return 'result for ' + url;
      },
      headers: null,
      getCall: 0
    };
    batchRequestor = require('../lib/batchRequestor')(mockRequestor);
  });

  it('should return result for all given url', co(function* () {

    assert.deepEqual(yield batchRequestor({resource1: '/resource1/5', resource2: '/resource2'}, '/host/api'), {
      resource1: 'result for /host/api/resource1/5',
      resource2: 'result for /host/api/resource2'
    });
  }));

  it ('should call requestor once for every request with baseurl + requestUrl', co(function* () {
    yield batchRequestor({resource1: '/resource1/5', resource2: '/resource2'}, '/host/api');

    assert.equal(mockRequestor.getCall, 2);
    mockRequestor.getCall = 0;

    yield batchRequestor({resource1: '/host/api/resource1/5', resource2: '/host/api/resource2', resource3: '/host/api/resource3'}, '/host/api');
    assert.equal(mockRequestor.getCall, 3);
  }));

  it('should use provided headers if any for every request', co(function* () {
    var expectedHeaders = { Accept: 'text/json'};

    yield batchRequestor({resource1: 'api/resource1/5', resource2: 'api/resource2'}, '/host/api', { Accept: 'text/json'});
    assert.deepEqual(mockRequestor.headers, expectedHeaders);

    assert.equal(mockRequestor.getCall, 2);
  }));
});
