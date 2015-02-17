'use strict';

module.exports = function (requestor) {
  /* Extracted from https://github.com/hapijs/wreck library */
  function parseCacheControl(field) {
    /*
      Cache-Control   = 1#cache-directive
      cache-directive = token [ "=" ( token / quoted-string ) ]
      token           = [^\x00-\x20\(\)<>@\,;\:\\"\/\[\]\?\=\{\}\x7F]+
      quoted-string   = "(?:[^"\\]|\\.)*"
    */

    //                             1: directive                                        =   2: token                                              3: quoted-string
    var regex = /(?:^|(?:\s*\,\s*))([^\x00-\x20\(\)<>@\,;\:\\"\/\[\]\?\=\{\}\x7F]+)(?:\=(?:([^\x00-\x20\(\)<>@\,;\:\\"\/\[\]\?\=\{\}\x7F]+)|(?:\"((?:[^"\\]|\\.)*)\")))?/g;

    var header = {};
    var err = field.replace(regex, function ($0, $1, $2, $3) {
      var value = $2 || $3;
      header[$1] = value ? value.toLowerCase() : true;

      return '';
    });

    var integerFieldValue;
    for (var integerField in ['max-age', 's-maxage']) {
      if (integerField in header) {
        try {
          integerFieldValue = parseInt(header[integerField], 10);
          if (isNaN(integerFieldValue)) {
            return null;
          }

          header[integerField] = integerFieldValue;
        }
        catch (err) { }
      }
    }

    return (err ? null : header);
  };

  return function* batchRequestor(requests, baseUrl, headers) {
    var results = {},
        requestsThunks = [],
        i = 0,
        name;

    for (name in requests) {
      requestsThunks[i] = requestor.get(baseUrl + requests[name], headers);
      results[name] = i;
      i++;
    }

    var resultsArray = yield requestsThunks,
        responseHeaders = {},
        header,
        headerName,
        totalResults = 0,
        totalCacheControl = 0,
        maxMaxAge = 0,
        maxSharedMaxAge = 0,
        privateCache = false,
        publicCache = false,
        noCache = false,
        varies = [],
        parsedCacheControl;

    for (name in results) {
      results[name] = resultsArray[results[name]];
      if (!results[name] || noCache) {
        continue;
      }

      ++totalResults;

      for (i in results[name].headers) {
        header = results[name].headers[i];
        headerName = header.name.toLowerCase();

        if ('cache-control' === headerName) {
          parsedCacheControl = parseCacheControl(header.value);

          if (parsedCacheControl['no-cache']) {
            noCache = true;

            break;
          }

          if (parsedCacheControl.private) {
            privateCache = true;
          }

          if (parsedCacheControl.public) {
            publicCache = true;
          }

          if (parsedCacheControl['max-age'] && parsedCacheControl['max-age'] > maxMaxAge) {
            maxMaxAge = parsedCacheControl['max-age'];
          }

          if (parsedCacheControl['s-maxage'] && parsedCacheControl['s-maxage'] > maxSharedMaxAge) {
            maxSharedMaxAge = parsedCacheControl['s-maxage'];
          }

          ++totalCacheControl;
        }

        if ('vary' === headerName) {
          header.value.split(',').forEach(function (vary) {
            vary = vary.trim();
            if (-1 === varies.indexOf(vary)) {
              varies.push(vary);
            }
          })
        }
      }
    }

    if (noCache) {
      responseHeaders['Cache-Control'] = 'no-cache';

    } else if (totalCacheControl === totalResults) {
      if (privateCache || publicCache || maxMaxAge || maxSharedMaxAge) {
        var cacheControl = [];

        if (privateCache) {
          cacheControl.push('private');
        } else if (publicCache) {
          cacheControl.push('public');
        }

        if (maxMaxAge) {
          cacheControl.push('max-age=' + maxMaxAge);
        }

        if (maxSharedMaxAge) {
          cacheControl.push('s-maxage=' + maxSharedMaxAge);
        }

        responseHeaders['Cache-Control'] = cacheControl.join(", ");
      }

      if (varies.length) {
        responseHeaders.Vary = varies.join(", ");
      }
    }

    return { body: results, headers: responseHeaders };
  };
};
