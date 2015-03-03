'use strict';

module.exports = {
  /* Extracted from https://github.com/hapijs/wreck library */
  _parseCacheControl: function (field) {
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
  },

  extract: function (headers) {
    var header,
        cacheControl = false,
        varies = [];

    for (var i in headers) {
      header = headers[i];

      switch (header.name.toLowerCase()) {
        case 'cache-control':
          var parsedCacheControl = this._parseCacheControl(header.value);

          cacheControl = {
            maxAge: 0,
            sharedMaxAge: 0,
            'private': false,
            'public': false,
            noCache: false
          };

          if ('no-cache' in parsedCacheControl) {
            cacheControl.noCache = true;

            break;
          }

          if ('private' in parsedCacheControl) {
            cacheControl['private'] = true;
          }

          if ('public' in parsedCacheControl) {
            cacheControl['public'] = true;
          }

          if ('max-age' in parsedCacheControl) {
            cacheControl.maxAge = parsedCacheControl['max-age'];
          }

          if ('s-maxage' in parsedCacheControl) {
            cacheControl.sharedMaxAge = parsedCacheControl['s-maxage'];
          }

          break;

        case 'vary':
          header.value.split(',').forEach(function (vary) {
            varies.push(vary.trim());
          });
        break;
      }
    }

    return {
      cacheControl: cacheControl,
      varies: varies
    };
  },

  compute: function (headers, totalResults) {
    var totalCacheControl = 0, name;

    for (name in headers) {
      if (false === headers[name].cacheControl) {
        continue;
      }

      // if one of header contain no-cache so force to no-cache
      if (headers[name].cacheControl.noCache) {
        return { 'Cache-Control': 'no-cache' };
      }

      ++totalCacheControl;
    }

    if (totalCacheControl !== totalResults) {
      return {};
    }

    var responseHeaders = {},
        privateCache = false,
        publicCache = false,
        maxMaxAge = 0,
        maxSharedMaxAge = 0,
        currentCacheControl = {},
        currentVaries = [],
        varies = [];

    for (name in headers) {
      currentCacheControl = headers[name].cacheControl;
      currentVaries = headers[name].varies;

      if (currentCacheControl.maxAge > maxMaxAge) {
        maxMaxAge = currentCacheControl.maxAge;
      }

      if (currentCacheControl.sharedMaxAge > maxSharedMaxAge) {
        maxSharedMaxAge = currentCacheControl.sharedMaxAge;
      }

      if (currentCacheControl['private']) {
        privateCache = true;
      }

      if (currentCacheControl['public']) {
        publicCache = true;
      }

      for (var i in currentVaries) {
        if (-1 === varies.indexOf(currentVaries[i])) {
          varies.push(currentVaries[i]);
        }
      }
    }

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

    return responseHeaders;
  }
}
