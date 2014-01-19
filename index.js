/*

index.js - "tart-transport-eventsource": Tart HTTP EventSource transport

The MIT License (MIT)

Copyright (c) 2014 Dale Schumacher, Tristan Slominski

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

var fs = require('fs');
var http = require('http');
var path = require('path');
var url = require('url');

var transport = module.exports;

transport.server = function server(ansible) {
    var _server;
    var _domains = {};
    var _receptionist;

    var closeBeh = function closeBeh(ack) {
        if (!_server) {
            return; // do nothing if not listening
        }

        _server.on('close', function () {
            ack && typeof ack === 'function' && ack();
            _server = null;
        });
        _server.close();
    };

    var listenBeh = function listenBeh(message) {
        if (_server) {
            return; // do nothing if already listening
        }

        // create a receptionist singleton to give to ansible when a new client
        // domain connects
        if (!_receptionist) {
            _receptionist = this.sponsor(sendBeh);
        }

        _server = http.createServer();
        _server.on('request', function (req, res) {
            var parsedUrl = url.parse(req.url, true);

            // FIXME: remove serving the demo code
            if (req.method === 'GET' && parsedUrl.pathname == '/index.html') {
                res.writeHead(200, {'Content-Type': 'text/html'});
                var filePath = path.normalize(path.join(__dirname, 'public', 'index.html'));
                res.write(fs.readFileSync(filePath));
                res.end();
                return;
            }

            // verify valid request URI
            var parsedPathname = parsedUrl.pathname.match('^/events/(.+)$');
            if (req.method !== 'GET'
                || !parsedPathname
                || req.headers.accept !== 'text/event-stream') {

                res.writeHead(400);
                res.end();
                return;
            }

            // store the client domain and socket for duration of the connection
            var clientDomain = parsedPathname[1];
            _domains[clientDomain] = res;

            // register the domain
            ansible.registerDomain(clientDomain, _receptionist);

            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });

            // drop client domain and socket when client disconnects
            res.socket.on('close', function () {
                req.removeAllListeners();
                delete _domains[clientDomain];
            });
        });
        _server.on('listening', function () {
            message.ok && message.ok({host: message.host, port: message.port});
        });
        _server.on('error', function (error) {
            message.fail && message.fail(error);
        });
        _server.listen(message.port, message.host);
    };

    var sendBeh = function sendBeh(message) {
        if (!message.address) {
            if (message.fail) {
                message.fail(new Error("Missing address"));
            }
            return;
        }

        var schemeAndRest = message.address.split('://');
        if (schemeAndRest[0].toLowerCase() !== 'ansible') {
            if (message.fail) {
                message.fail(new Error("Invalid protocol " + schemeAndRest[0]));
            }
            return;
        }

        var authorityAndCapability = schemeAndRest[1].split('/#');
        if (authorityAndCapability.length !== 2) {
            if (message.fail) {
                message.fail(new Error("Invalid URI " + message.address));
            }
            return;
        }

        var authority = authorityAndCapability[0];
        var domain = _domains[authority];
        if (!domain) {
            // we don't have the specified domain connected
            // report to Ansible
            // FIXME: uncomment once ansible.unregisterDomain() is implemented
            // ansible.unregisterDomain(authority);
            return;
        }

        domain.write("data: " + message.address + '\n');
        domain.write("data: " + message.content + '\n\n');
    };

    return {
        closeBeh: closeBeh,
        listenBeh: listenBeh,
        sendBeh: sendBeh
    };
};