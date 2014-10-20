var co = require('co');
var assert = require('chai').assert;

describe('httpClient', function () {
  var httpClient, superAgentMock;

  beforeEach(function () {
    superAgentMock = {
      get: function (){return this;},
      set: function () {return this;},
      on: function () {return this;},
      end: function (cb) {
        cb({});
      }
    };
    httpClient = require('../lib/httpClient')(superAgentMock);
  });

  it('should throw an error on unknown error', co(function* () {
    superAgentMock.on = function (type, cb) {
      cb(new Error('unexpected'));
    };

    var error;
    try {
      yield httpClient.get('wrong/url');
    } catch (e) {
      error = e;
    }

    assert.notEqual(error, null);
    assert.deepEqual(error.message, 'unexpected');
  }));

  it('should return res with code 404 on inexistant url', co(function* () {
    superAgentMock.on = function (type, cb) {
      cb({code: 'ENOTFOUND'});
    };

    assert.deepEqual(yield httpClient.get('wrong/url'), {
      code: 404
    });
  }));

  it('should send get request to given url using provided agent returning response code headers and body', co(function* () {
    superAgentMock.end = function (cb) {
      cb({
        status: 200,
        headers: {
          "Content-Type": "text/javascript; charset=UTF-8"
        },
        body: 'result'
      });
    };

    assert.deepEqual(yield httpClient.get('api/resources'), {
      code: 200,
      headers: [
        { "name": "Content-Type", "value": "text/javascript; charset=UTF-8" }
      ],
      body: 'result'
    });
  }));

  it('should set the headers values on the request if provided', co(function* () {

    var setCall = 0;

    superAgentMock.set = function (name, value) {
      setCall++;
      var expectation = {
        'Accept': 'text/javascript; charset=UTF-8',
        'Access-Token': '4589edf54'
      };
      assert.equal(expectation[name], value);

      return this;
    };

    yield httpClient.get('api/resources', {'Access-Token': '4589edf54', 'Accept': 'text/javascript; charset=UTF-8'});

    assert.equal(setCall, 2, 'set method should have been called twice');
  }));

  it('should parse the response headers', co(function* () {

    superAgentMock.end = function (cb) {
      cb({
        status: 200,
        headers: {
          'response-header': 'some header',
          'one-more': 'another header'
        },
        body: 'result'
      });
    };

    assert.deepEqual((yield httpClient.get('api/resources')).headers, [
      { "name": "response-header", "value": "some header" },
      { "name": "one-more", "value": "another header" }
    ]);

  }));

});
