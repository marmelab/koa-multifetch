'use strict';

var request = require('superagent');
var coBody = require('co-body');
var batchRequestor = require('./batchRequestor')(require('./httpClient')(require('superagent')));

module.exports = function (options) {
  options = options || {};
  var er = 0;
  return function* batch() {
    var data;
    try {
      data = yield coBody(this);
    } catch (e) {
      data = this.request.query;
    }

    if (options.header_host) {
      this.headers.host = options.header_host;
    }

    var baseUrl = options.absolute ? this.headers.host : this.headers.host + this.req._parsedUrl.pathname;

    var result = yield batchRequestor(data, baseUrl, this.headers);

    this.body = result.body;
    for (var name in result.headers) {
      this.set(name, result.headers[name]);
    }
  };
};
