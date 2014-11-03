# koa-multifetch

A simple [koa.js](http://koajs.com/) middleware to multiplex several HTTP requests into one. Very useful on mobile devices where latency can kill performance. Based on [Facebook's Batch Requests philosophy](https://developers.facebook.com/docs/graph-api/making-multiple-requests), and inspired by [multifetch](https://github.com/e-conomic/multifetch) for Express.

## Installation

Install the package, then mount the middleware on any URL, using [koa-route](https://github.com/koajs/route). For example, to add `/multi` as a multifetch endpoint:

```js
var multifetch = require('koa-multifetch')();
var koaRoute = require('koa-route');
app.use(koaRoute.post('/multi', multifetch));
```

koa-multifetch can be mounted both as a GET and POST route.

## Usage

Send a request to the route where the middleware is listening, passing the requests to fetch in parallel as a JSON object in the request body. For instance, to fetch `/products/1` and `/users` in parallel, make the following request:

```
POST /multi HTTP/1.1
Content-Type: application/json
{
    "product": "/products/1",
    "all_users": "/users"
} 
```

The middleware will call both HTTP resources, and return a response with a composite body once all the requests are fetched:
```
{ 
    "product": {
        "code":"200",
        "headers":[
            { "name": "Content-Type", "value": "text/javascript; charset=UTF-8" }
        ],
        "body": "{ id: 1, name: \"ipad2\", stock: 34 }"
    },
    "all_users": {
        "code":"200",
        "headers":[
            { "name": "Content-Type", "value": "text/javascript; charset=UTF-8" }
        ],
        "body": "[{ id: 2459, login: \"john\" }, { id: 7473, login: \"jane\" }]"
    }
}
```

Any header present in the multifetch request will be automatically added to all sub-requests.

**Tip**: When mounted as a GET route, koa-multifetch reads the query parameters to determine the requests to fetch:

```
GET /multi?product=/product/1&all_users=/users HTTP/1.1
```

## License

koa-multifetch is licensed under the [MIT Licence](LICENSE), courtesy of [marmelab](http://marmelab.com).
