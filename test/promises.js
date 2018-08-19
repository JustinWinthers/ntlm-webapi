(function (){
    /*global describe, it provided by mocha*/

    'use strict';

    var expect = require('chai').expect
        , WebApiRequest = require('../')
        , nock = require('nock')
        , webapi = new WebApiRequest({
            url: 'https://my.successful.webapi.call',
            username: 'myusername',
            password: 'mypassword',
            workstation: '',
            domain: 'nreca'
        });


    describe('PROMISES:', function () {

        createNockInstances(2);

        it('promise method should return a promise when a callback is not specified', function (done) {
            expect(webapi.get()).to.have.property('then');
            done();
        });

        createNockInstances(1);

        it('authorize method should return a promise when a callback is not specified', function (done) {
            expect(webapi.authorize('GET')).to.have.property('then');
            done();
        });
    });


    function createNockInstances(iterator){

        for (var i=0; i<iterator; i++){
            // setup fake webapi url instance for type 1 and type 3 posts
            nock('https://my.successful.webapi.call')
                .intercept('/','GET')
                .reply(200, 'Mocked webapi Service',
                { 'content-type': 'text/html; charset=us-ascii',
                    'www-authenticate': 'NTLM somecrazylongauthenticationbearerstring'
                }
            );
        }

    }

})();
