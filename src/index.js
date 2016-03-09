'use strict';

var ntlm = require('httpntlm').ntlm,
    async = require('async'),
    httpreq = require('httpreq'),
    HttpAgent = require('agentkeepalive'),
    Promise = require('bluebird'),
    keepaliveAgent = new HttpAgent({
        keepAlive: true
    });


var ntlmWebRequest = function(options) {

    this.options = options;

    this.options.workstation = this.options.workstation || '';


};

ntlmWebRequest.prototype = {

    buildType1Message: function(options){

        return ntlm.createType1Message(options)
    },

    postType1ToServer: function(request, callback){

        var _options = {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Connection': 'keep-alive',
                'Authorization': request.type1msg
            },
            agent: keepaliveAgent
        };

        if (request.body) _options.body = request.body;

        return httpreq[request.method](request.options.url, _options, function (err, res){
            callback (err, res);
        });
    },

    buildType2Message: function(res){

        var error;

        var type2Message = ntlm.parseType2Message(res.headers['www-authenticate'], function(err){error=err});

        if (error) return undefined;
        else return type2Message;

    },

    buildType3Message: function(type2Message, options){

        return ntlm.createType3Message(type2Message, options)

    },

    postType3ToServer: function(request, callback){

        var _options = {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Connection': 'Close',
                'Authorization': request.type3msg
            },
            allowRedirects: false,
            agent: keepaliveAgent
        };

        if (request.body) _options.body = request.body;

        return httpreq[request.method](request.options.url, _options, callback);
    },

    parseResponse: function(response, callback){

        if (response.statusCode === 200) {

            var data = response.body;

            if (typeof data === 'string') data = JSON.parse(data);

            callback(null, data);

        } else {

            callback(response);

        }
    },

    getAuthToken: function(self) {

        return new Promise(function (resolve, reject){

            async.waterfall([

                function (callback) {

                    self.postType1ToServer(self, callback);

                },

                function (res, callback) {

                    if (!res.headers['www-authenticate'])
                        return callback(new Error('www-authenticate not found on response of type 2 request'));
                    else {
                        callback(null, self.type2msg = self.buildType2Message(res));

                    }

                },

                function(type2message, callback) {

                    if (type2message){
                        callback(null, self.type3msg = self.buildType3Message(type2message, self.options));
                    } else {
                        callback(null, null)
                    }


                }],

                function (err, token) {

                    if (err) reject (err);

                    if (token) {

                        self.isAuthorized = true;

                        resolve (token);

                    } else {

                        self.isAuthorized = false;

                        resolve(undefined);
                    }

                });

        });

    },

    processAuthorizedRequest: function(context){

        return new Promise(function (resolve, reject){

            async.waterfall([

                function (callback) {

                    context.postType3ToServer(context, callback);

                },

                function (responseFromServerType3, callback){

                    context.parseResponse(responseFromServerType3, callback)

                }],

                function (err, data) {

                    if (err) reject(err);

                    if (data) resolve(data);

                });

        });

    },

    get: function(cb){

        this.method = 'get';
        this.body = undefined;

        if (cb) {
            this.run(cb);
        } else return this.run(cb);

    },

    post: function(body, cb){

        this.method = 'post';

        if (typeof body === 'object') this.body = JSON.stringify(body);
        else this.body = body;

        if (cb) {
            this.run(cb)
        } else return this.run(cb);

    },

    authorize: function(method, callback){

        if (typeof method !== 'string') throw new Error('HTTP verb not provided: If authorizing first, you must provide the http method as a parameter');

        var validMethod = ~['GET','POST','PUT','DELETE'].indexOf(method.toUpperCase());

        if (!validMethod) throw new Error('Authorize method must be passed a valid HTTP verb');

        var self = this;

        self.method = method.toLowerCase();

        self.type1msg = self.buildType1Message(self.options);

        if (callback){

            self.getAuthToken(self)

                .then(function(token){

                    if (token) callback(null, token);

                    else {
                        //try again

                        if (!self.tryAgain){

                            self.tryAgain = true;

                            self.authorize(method, callback);

                        } else {
                            throw new Error('Unable to successfully authorize to service and process Type2 message')
                        }

                    }

                })

                .error(function(err){
                    callback(err);
                });

        } else {

            return self.getAuthToken(self)

                    .then(function(token){

                        if (token){

                            return new Promise(function (resolve){resolve(token)})
                        }

                        else {
                            //try again

                            if (!self.tryAgain){

                                self.tryAgain = true;

                                return self.authorize(method);

                            } else {
                                throw new Error('Unable to successfully authorize to service and process Type2 message')
                            }

                        }

                    })
        }

    },

    run: function (cb) {

        var self = this;

        if (self.isAuthorized){

            if (cb) {

                self.processAuthorizedRequest(self)

                    .then(function(result){
                        cb(null, result) })

                    .error(function(err){ cb(err)})
            }

            else return self.processAuthorizedRequest(self);

        } else {

            if (cb){

                self.authorize(self.method, function (err, token){

                    if (err) cb(err);

                    if (token) {
                        self.run(cb)
                    }
                })

            } else return self.authorize(self.method)
                .then(function(){
                    return self.run();
                })

        }
    }
};

module.exports = ntlmWebRequest;