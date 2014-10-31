A simple koa middleware to make multi get request.

To use it simply do :
mount it on the get or post route you want, using koa-route for example
```
app.use(koaRoute.post('/api', require('koa-multifetch')()));
```
It work with both GET and POST
You can send a GET request 
```
GET /api?product=/product/1&all_users=/users HTTP/1.1
```
Or you can post several request to the apiUrl like this:
```
POST /api HTTP/1.1
Content-Type: application/json
{
    "product": "/product/1",
    "allUsers": "/users"
} 
```
The middleware will do the corresponding request :
```
/api/product/1
/api/users
```
Retrieving the response and sending them back together :
```
{ 
    "product": {
        "code":"200",
        "headers":[
            { "name": "Content-Type", "value": "text/javascript; charset=UTF-8" }
        ],
        "body": "{product1Data}"
    },
    "allUsers": {
        "code":"200",
        "headers":[
            { "name": "Content-Type", "value": "text/javascript; charset=UTF-8" }
        ],
        "body": "[user,...]"
    }
}
```
Any headers of the multifetch request, will be automatically added to all sub-request
