var request = require('superagent');
var coBody = require('co-body');
var batchRequestor = require('./batchRequestor')(require('./httpClient')(require('superagent')));

module.exports = function (absolute) {
  var er = 0;
  return function* batch() {
    var data;
    try {
      data = yield coBody(this);
    } catch (e) {
      data = this.request.query;
    }

    var baseUrl = absolute ? this.headers.host : this.headers.host + this.req._parsedUrl.pathname;

    this.body = yield batchRequestor(data, baseUrl, this.headers);
  }
}
