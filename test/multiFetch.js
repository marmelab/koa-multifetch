var assert = require('chai').assert;
var co = require('co');
var koa = require('koa');
var koaRoute = require('koa-route');
var request = require('supertest');
var batch = require('../lib/multiFetch');

describe('multifetch', function () {
  var app;

  before(function () {
    app = koa();
    app.use(koaRoute.post('/api', batch()));
    app.use(koaRoute.get('/api', batch()));
    app.use(koaRoute.get('/api/resource1', function* () {
      this.set('Custom-Header', 'why not');
      this.body = {result: 'resource1'};
    }));
    app.use(koaRoute.get('/api/resource2/:id', function* (id) {
      this.set('Other-Custom-Header', 'useful');
      this.body = {result: 'resource2/' + id};
    }));
    app.use(koaRoute.get('/api/boom', function* (id) {
      throw new Error('boom');
    }));
    app.use(koaRoute.get('/api/protected', function* (id) {
      if (this.get('Authorization') === 'Token abcdef') {
        this.body = true;
        return;
      }
      this.status = 403;
    }));
  });

  it ('should return code 404 if url is not found', function (done) {
    request.agent(app.listen())
      .post('/api')
      .send({wrong: '/wrong'})
      .expect(function (res) {
        assert.equal(res.body.wrong.code, 404);
        assert.deepEqual(res.body.wrong.body, {});
      })
      .end(done);
  });

  it ('should return code 500 if server error occur', function (done) {
    request.agent(app.listen())
      .post('/api')
      .send({boom: '/boom'})
      .expect(function (res) {
        assert.equal(res.body.boom.code, 500);
      })
      .end(done);
  });

  describe('GET', function () {

    it('should call each passed request and return their result', function (done) {
      request.agent(app.listen())
        .get('/api?resource1=/resource1&resource2=/resource2/5')
        .expect(function (res) {
          assert.equal(res.body.resource1.code, 200);
          assert.deepEqual(res.body.resource1.body, {result: 'resource1'});
          assert.equal(res.body.resource2.code, 200);
          assert.deepEqual(res.body.resource2.body, {result: 'resource2/5'});
        })
        .end(done);
    });

    it('should use main request headers on each sub request', co(function* () {
      var response = yield function (done) {
        request.agent(app.listen())
          .get('/api?protected=/protected')
          .set('Authorization', 'Token wrongtoken')
          .end(done);
      };

      assert.equal(response.body.protected.code, 403);

      yield function (done) {
        request.agent(app.listen())
          .get('/api?protected=/protected')
          .set('Authorization', 'Token abcdef')
          .expect(200)
          .end(done);
      };

      assert.equal(response.body.protected.code, 403);
    }));

    it('should return the header for each request', function (done) {
      request.agent(app.listen())
        .get('/api?resource1=/resource1&resource2=/resource2/5')
        .expect(function (res) {
          assert.include(res.body.resource1.headers, {name: 'custom-header', value: 'why not'});
          assert.include(res.body.resource2.headers, {name: 'other-custom-header', value: 'useful'});
        })
        .end(done);
    });

  });

  describe('POST', function () {

    it ('should call each passed request and return their result', function (done) {
      request.agent(app.listen())
        .post('/api')
        .send({resource1: '/resource1', resource2: '/resource2/5'})
        .expect(function (res) {
          assert.equal(res.body.resource1.code, 200);
          assert.deepEqual(res.body.resource1.body, {result: 'resource1'});
          assert.equal(res.body.resource2.code, 200);
          assert.deepEqual(res.body.resource2.body, {result: 'resource2/5'});
        })
        .end(done);
    });

    it ('should return the header for each request', function (done) {
      request.agent(app.listen())
        .post('/api')
        .send({resource1: '/resource1', resource2: '/resource2/5'})
        .expect(function (res) {
          assert.include(res.body.resource1.headers, {name: 'custom-header', value: 'why not'});
          assert.include(res.body.resource2.headers, {name: 'other-custom-header', value: 'useful'});
        })
        .end(done);
    });

  });

  describe('absolute url to true', function () {

    before (function () {
      app.use(koaRoute.post('/absolute_path', batch({absolute: true})));
    });

    describe('POST', function () {

      it('should call each passed request  and return their result', co(function* () {
        var response = yield function (done) {
          request.agent(app.listen())
            .post('/absolute_path')
            .send({resource1: '/api/resource1', resource2: '/api/resource2/5'})
            .end(done);
        };

        assert.equal(response.body.resource1.code, 200);
        assert.deepEqual(response.body.resource1.body, {result: 'resource1'});
        assert.equal(response.body.resource2.code, 200);
        assert.deepEqual(response.body.resource2.body, {result: 'resource2/5'});
      }));

      it ('should return the header for each request', function (done) {
        request.agent(app.listen())
          .post('/absolute_path')
          .send({resource1: '/api/resource1', resource2: '/api/resource2/5'})
          .expect(function (res) {
            assert.include(res.body.resource1.headers, {name: 'custom-header', value: 'why not'});
            assert.include(res.body.resource2.headers, {name: 'other-custom-header', value: 'useful'});
          })
          .end(done);
      });

    });
  });

  after(function () {
    delete app;
  });

});
