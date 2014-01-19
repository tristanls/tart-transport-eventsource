/*

readme.js - example from the README

The MIT License (MIT)

Copyright (c) 2014 Tristan Slominski

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

*/
"use strict";

var ansible = require('tart-ansible');
var crypto = require('crypto');
var Discover = require('discover');
var DiscoverTcpTransport = require('discover-tcp-transport');
var httpTransport = require('tart-transport-http');
var tart = require('tart');
var transport = require('../index.js');

var sponsor = tart.minimal();

// create discover TCP transports

var discoverTcpTransport1 = new DiscoverTcpTransport({port: 6741});
var discoverTcpTransport2 = new DiscoverTcpTransport({port: 6742});
var discoverTcpTransport3 = new DiscoverTcpTransport({port: 6743});

// create discover-only initial seed domain names

var discoverDomain1 = crypto.randomBytes(42).toString('base64');
var discoverDomain2 = crypto.randomBytes(42).toString('base64');
var discoverDomain3 = crypto.randomBytes(42).toString('base64');

// create discover node contacts

var discoverNode1 = {id: discoverDomain1, transport: {host: 'localhost', port: 6741}};
var discoverNode2 = {id: discoverDomain2, transport: {host: 'localhost', port: 6742}};
var discoverNode3 = {id: discoverDomain3, transport: {host: 'localhost', port: 6743}};

// assign seed nodes

var seeds = [discoverNode1, discoverNode2];

// create discover instances

var discover1 = new Discover({seeds: seeds, transport: discoverTcpTransport1});
var discover2 = new Discover({seeds: seeds, transport: discoverTcpTransport2});
var discover3 = new Discover({seeds: seeds, transport: discoverTcpTransport3});

// turn on discover TCP transports

var turnOn = function (transport, next) {
    return function () {
        transport.listen(next);
    };
};

console.log('turning on Discover TCP transports');

turnOn(discoverTcpTransport1,
    turnOn(discoverTcpTransport2,
        turnOn(discoverTcpTransport3,
            function () {

console.log('Discover TCP transports are ON');

// bootstrap discover instances with self awareness

discover1.register(discoverNode1);
discover2.register(discoverNode2);
discover3.register(discoverNode3);

// create ansible node capabilities

var ansibleCaps1 = ansible.capabilities(discover1);
var ansibleCaps2 = ansible.capabilities(discover2);
var ansibleCaps3 = ansible.capabilities(discover3);

// create ansible send actors

var ansibleSend1 = sponsor(ansibleCaps1.sendBeh);
var ansibleSend2 = sponsor(ansibleCaps2.sendBeh);
var ansibleSend3 = sponsor(ansibleCaps3.sendBeh);

// register Tart transports

var httpSend1 = sponsor(httpTransport.sendBeh);
var httpSend2 = sponsor(httpTransport.sendBeh);
var httpSend3 = sponsor(httpTransport.sendBeh);

ansibleCaps1.registerTransport({
    scheme: 'http', 
    send: httpSend1,
    data: 'http://localhost:8081'
});
ansibleCaps2.registerTransport({
    scheme: 'http', 
    send: httpSend2,
    data: 'http://localhost:8082'
});
ansibleCaps3.registerTransport({
    scheme: 'http', 
    send: httpSend3,
    data: 'http://localhost:8083'
});

// create HTTP transports and direct them to the ansible receptionists

var ansibleReceptionist1 = sponsor(ansibleCaps1.receptionistBeh);
var ansibleReceptionist2 = sponsor(ansibleCaps2.receptionistBeh);
var ansibleReceptionist3 = sponsor(ansibleCaps3.receptionistBeh);

var httpCaps1 = httpTransport.server(ansibleReceptionist1);
var httpCaps2 = httpTransport.server(ansibleReceptionist2);
var httpCaps3 = httpTransport.server(ansibleReceptionist3);

var listenHttp1 = sponsor(httpCaps1.listenBeh);
var listenHttp2 = sponsor(httpCaps2.listenBeh);
var listenHttp3 = sponsor(httpCaps3.listenBeh);

var turnOnTransport = function (listen, port, next) {
    return function () {
        listen({host: 'localhost', port: port, ok: next});
    }
};

console.log('turning on Tart transports');

turnOnTransport(listenHttp1, 8081,
    turnOnTransport(listenHttp2, 8082,
        turnOnTransport(listenHttp3, 8083, 
            function () {

console.log('Tart transports are ON');
console.log('');        

var serverCapabilities = transport.server({
    registerDomain: ansibleCaps1.registerDomain,
    unregisterDomain: ansibleCaps1.unregisterDomain
});
var listen = sponsor(serverCapabilities.listenBeh);
var send = sponsor(serverCapabilities.sendBeh);

var fail = sponsor(function (error) {
    console.dir(error);
});

var ansibleSends = [
    {send: ansibleSend1, ansible: '[ansible 1==]'}, 
    {send: ansibleSend2, ansible: '[ansible =2=]'}, 
    {send: ansibleSend3, ansible: '[ansible ==3]'}
];

var sendMessage = function sendMessage() {
    var origin = ansibleSends[Math.floor(Math.random() * ansibleSends.length)];
    console.log(origin.ansible, 'sending');
    origin.send({
        address: 'ansible://83tBJ0drTKIHGLhXJ0/B/FIRFqDvAOuAQFuVtLfew+kl0UyiPVxOIUn4/#nn1YJx8EzWSQnup40cdd2ZUDRA1EYC210ARR7RRc8WHyxrPLLqE8Zxdu',
        content: 'from ' + origin.ansible + ' ' + new Date(),
        fail: fail
    });
};

var listenAck = sponsor(function listenAckBeh(message) {
    console.log('transport is listening, please load http://' + message.host + ':' + message.port + '/index.html in your browser');
    setInterval(sendMessage, 2000);
});

listen({
    host: 'localhost', 
    port: 8080, 
    ok: listenAck,
    fail: fail
});

})))(); // turnOnTransport

})))(); // turnOn