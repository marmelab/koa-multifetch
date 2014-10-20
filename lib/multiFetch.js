var request = require('superagent');
var coBody = require('co-body');
var batchRequestor = require('./batchRequestor')(require('./httpClient')(require('superagent')));

module.exports = function () {
  return function* batch() {
    var data = yield coBody(this);

    this.body = yield batchRequestor(data, this.headers.host + this.req.url, {'Access-Token': this.get('Access-Token')});
  }
}
