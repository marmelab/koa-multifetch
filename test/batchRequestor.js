var assert = require('chai').assert;
var co = require('co');

describe('batchRequestor', function () {
  var mockRequestor, batchRequestor;

  beforeEach(function () {
    mockRequestor = {
      get: function* (url, headers) {
        this.getCall++;
        this.headers = headers;

        return { code: 200, body: 'result for ' + url, headers: {} };
      },
      headers: null,
      getCall: 0
    };
    batchRequestor = require('../lib/batchRequestor')(mockRequestor);
  });

  it('should return result for all given url', co(function* () {
    var result = yield batchRequestor({resource1: '/resource1/5', resource2: '/resource2'}, '/host/api');
    assert.deepEqual(result.body, {
      resource1: { code: 200, body: 'result for /host/api/resource1/5', headers: {} },
      resource2: { code: 200, body: 'result for /host/api/resource2', headers: {} }
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

  it('should include Cache-Control and Vary headers extracted from results', co(function* () {
    var responseHeaders = {};
    mockRequestor = {
      get: function* (url, headers) {
        responseHeaders = {};
        if ('/api/1' === url) {
          responseHeaders = [
            { name: 'Cache-Control', value: 'public, max-age=300' },
            { name: 'Vary', value: 'Cookie' }
          ];
        }
        if ('/api/2' === url) {
          responseHeaders = [
            { name: 'Cache-Control', value: 'public, max-age=3600, s-maxage=3600' },
            { name: 'Vary', value: 'User-Agent' }
          ];
        }

        return { code: 200, body: 'result for ' + url, headers: responseHeaders };
      }
    }
    batchRequestor = require('../lib/batchRequestor')(mockRequestor);

    var results = yield batchRequestor({resource1: 'api/1', resource2: 'api/2'}, '/');
    assert.deepEqual(results.headers, { 'Cache-Control': 'public, max-age=3600, s-maxage=3600', Vary: 'Cookie, User-Agent' });
  }));

  it('should not include Cache-Control and Vary header if at least one of results omit them', co(function* () {
    var responseHeaders = {};
    mockRequestor = {
      get: function* (url, headers) {
        responseHeaders = {};
        if ('/api/1' === url) {
          responseHeaders = [
            { name: 'Cache-Control', value: 'public, max-age=300' },
            { name: 'Vary', value: 'Cookie' }
          ];
        }

        return { code: 200, body: 'result for ' + url, headers: responseHeaders };
      }
    }
    batchRequestor = require('../lib/batchRequestor')(mockRequestor);

    results = yield batchRequestor({ resource1: 'api/1', resource2: 'api/2' }, '/');
    assert.deepEqual(results.headers, {});
  }));

  it('should set Cache-Control if at least one of results have no-cache directive', co(function* () {
    var responseHeaders = {};
    mockRequestor = {
      get: function* (url, headers) {
        responseHeaders = {};
        if ('/api/1' === url) {
          responseHeaders = [
            { name: 'Cache-Control', value: 'no-cache' }
          ];
        }

        return { code: 200, body: 'result for ' + url, headers: responseHeaders };
      }
    }
    batchRequestor = require('../lib/batchRequestor')(mockRequestor);

    results = yield batchRequestor({ resource1: 'api/1', resource2: 'api/2' }, '/');
    assert.deepEqual(results.headers, { 'Cache-Control': 'no-cache' });
  }));
});
