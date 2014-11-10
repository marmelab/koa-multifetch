var request = require('superagent');
var coBody = require('co-body');
var batchRequestor = require('./batchRequestor')(require('./httpClient')(require('superagent')));

module.exports = function () {
  var er = 0;
  return function* batch() {
    var data;
    try {
      data = yield coBody(this);
    } catch (e) {
      data = this.request.query;
    }

    this.body = yield batchRequestor(data, this.headers.host + this.req._parsedUrl.pathname, this.headers);
  }
}
