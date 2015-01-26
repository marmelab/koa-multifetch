var assert = require('chai').assert;
var co = require('co');
var koa = require('koa');
var koaRoute = require('koa-route');
var request = require('supertest');
var mockery = require('mockery');

describe('multifetch with custom header_host', function () {
  var app;
  var hostTest = null;

  before(function () {
    var mock_httpClient = function () {
      return {
        get: function *(url, headers) {
            hostTest = headers.host;
        }
      };
    };
    mockery.registerAllowable('./httpClient', true);
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    mockery.registerMock('./httpClient', mock_httpClient);
    var batch = require('../lib/multiFetch');

    app = koa();
    app.use(koaRoute.get('/api', batch(false, 'http://localhost:3000')));
    app.use(koaRoute.get('/api/resource1', function* () {
      this.set('Custom-Header', 'why not');
      this.body = {result: 'resource1'};
    }));
  });

  it('should set custom host on htttClient subrequest', co(function* () {
    var response = yield function (done) {
      request.agent(app.listen())
        .get('/api?resource1=/resource1')
        .end(done);
    };
    assert.equal(hostTest, 'http://localhost:3000');
  }));

  after(function () {
    mockery.disable();
    delete app;
  });

});
