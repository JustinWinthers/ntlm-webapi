# `ntlm-webapi`

Easily call a Windows authenticated soap service from Node

###### Inspired by the `ChrisGeorge Framework`

---

[![NPM](https://nodei.co/npm/ntlm-webapi.png?downloads=true&stars=true)](https://nodei.co/npm/ntlm-webapi/)

[![build status](https://secure.travis-ci.org/JustinWinthers/ntlm-webapi.png)](http://travis-ci.org/JustinWinthers/ntlm-webapi)

## Installation (via [npm](https://npmjs.org/package/ntlm-webapi))

```bash
$ npm install ntlm-webapi
```

## Usage

### Calling it from your app using a node style callback:

````javascript
    var Request = require('ntlm-webapi');

    var request = new Request({
        url: "http://some.restful.api.org/you/want/to/call",
        username: 'username',
        password: 'password',
        domain: 'company_domain'
    });

    request.get(function(err, result){

        if (err) console.log (err);

        console.log (result);
    });
````

### Calling it from your app using the promise based api:

````javascript

    var Request = require('ntlm-webapi');

    var request = new Request({
        url: "http://some.restful.api.org/you/want/to/call",
        username: 'username',
        password: 'password',
        domain: 'company_domain'
    });

    request.get()

        .then(function(result){
            console.log (result)
        })

        .error(function(err){
            console.log (err)
        });
````

### Authorizing the request first, and storing the token for subsequent calls

Alternatively, you can authorize the request when you start your web server so that subsequent calls
will use the already authorized service call.

When authorizing first, you must pass the HTTP verb you plan to use when executing the service so ntlm-webapi
knows which method to authenticate you against.

When authorizing first, you won't be logging in with each request.  Keepaliveagent is used to keep the socket open.
The following example shows how you can wire up a route after you've authorized the service so your app won't keep
reauthorizing the service, but instead stay authorized with a cached token it received from the initial auth request.

````javascript
    var WebApi = require('ntlm-webapi');

    var webapi = new WebApi({
        url: "http://some.restful.api.org/you/want/to/call",
        username: 'username',
        password: 'password',
        domain: 'company_domain'
    });

    webapi.authorize('GET')

       /* token is not used here, but shown to illustrate it exists.
          It's cached in the `soap` object  */

        .then (function(token){

            app.get('/route/to/soap/abstraction',function(req, res) {

                webapi.get()
                    .then(function(result){
                        res.status(200).json(result);
                    })
                    .error(function(err){
                        res.status(500).json({error:err});
                    }
                });
        })

        .error(function(err){

          /* throw an error to either stop the server from starting if it's severe
             enough or handle the error gracefully
          */

          throw new Error('failed to authorize soap service');

        };
````

### Authorizing the request first and stringing promises

All methods return a promise so you can also string a group of promises like so

````javascript
    var WebApi = require('ntlm-webapi');

    var webapi = new WebApi({
        url: "http://some.restful.api.org/you/want/to/call",
        username: 'username',
        password: 'password',
        domain: 'company_domain'
    });

    webapi.authorize('GET')
        .then (function(token){

            return request.get() })

        .then(function(result){
            console.log (JSON.stringify(result, undefined, '\t'));
        })

        .error(function(error){
            console.log (error)
        })
    ;
````

### Post Method

As of this version, only GET has been tested.  POST is beta but has an API where you pass in the body as a json object.  Multi-part is not yet handled.

````javascript
    var WebApi = require('ntlm-webapi');

    var webapi = new WebApi({
        url: "http://some.restful.api.org/you/want/to/call",
        username: 'username',
        password: 'password',
        domain: 'company_domain'
    });

    webapi.post({some:'data', to:'post'})

        .then(function(result){
            console.log (JSON.stringify(result, undefined, '\t'));
        })

        .error(function(error){
            console.log (error)
        })
    ;
````

## Configuration Object Options

| Option | Description
| --- | ---
| `url` | set to the full url address of the windows webapi you're calling.  Be sure to include the protocol `http:\\` or `https:\\` in the address *note: only works with http right now
| `username` | set this to your windows user account or a windows service account on the windows machine where the service resides
| `password` | set to the windows account password for the account used above
| `domain` | set to the windows domain where the service resides
| `workstation` | (Optional) set to the windows workstation name if required by your network

## Other Notes

- I highly recommend using the promise api over the callback api.  The promise API will soon handle retry's if the connection
closes because the connection has been idle.  A retry will be sent to reauthorize the request.  However, if you use the
callback api then you will have to manage this yourself by inspecting the error.

## Author

**[Follow me (@javascriptbully) on Twitter!](https://twitter.com/intent/user?screen_name=javascriptbully)**

[Justin Winthers](https://github.com/JustinWinthers) ([jwinthers@gmail.com](mailto:jwinthers@gmail.com))