'use strict';

process.env['MONGODB'] = 'mongodb://localhost:27017/mytestdb';
process.env.PORT = 4000;

var async = require('async'),
    ioc = require('socket.io-client'),
    request = require('request'),
    mongoose = require('mongoose');

var loadFixture = function(Model, fixture, next) {
    var model = Model(fixture);
    model.save(function(err, data) {
        next(err, data);
    });
};
module.exports.loadFixture = loadFixture;

var before = function(loadData, done) {
    function clearDB(next) {
        for (var i in mongoose.connection.collections) {
            mongoose.connection.collections[i].remove(function() {});
        }
        return next(null);
    }

    async.series([
        function(next) {
            if (mongoose.connection.readyState === 0) {
                mongoose.connect(process.env.MONGODB, function (err) {
                    if (err) {
                        throw err;
                    }
                    return clearDB(next);
                });
            } else {
                return clearDB(next);
            }
        },
        loadData
    ], function(err, results) {
        if (err) {
            console.log("Error instantiating fixtures: " + err);
        }
        done(err, results);
    });
};
module.exports.before = before;

var after = function (done) {
    mongoose.disconnect();
    return done();
};
module.exports.after = after;

var login = function(request, app, credentials, agent, url, done) {
    request(app).post('/login').send(credentials).expect(302).end(function(err, res) {
        if (err) done(err);
        agent.saveCookies(res);
        var req = request(app).get(url);
        agent.attachCookies(req);
        req.end(function(err, res){
            done(err, res);
        });
    });
};
module.exports.login = login;

var jar = request.jar();
var originalRequest = require('xmlhttprequest').XMLHttpRequest;
var socket

// creates a socket.io client for the given server
var getSocketClient = function (app, callback){
    var addr = app.server.address();
    if (!addr) addr = app.server.listen().address();
    request.get({jar: jar, url: 'http://' + addr.address + '/logout'}, function(err, res) {
        var url = 'ws://' + addr.address + ':' + addr.port;
        var socket = ioc.connect(url);
        socket.socket.reconnect();
        console.log('logging connect!!!!!!', socket);
        callback(socket);
    });
};
module.exports.getSocketClient = getSocketClient;

var getAuthenticatedSocketClient = function(app, credentials, next) {
    var server = app.server;
    var addr = server.address();
    if (!addr) addr = server.listen().address();
    var url = 'http://' + addr.address + ':' + addr.port;

    require(app.get('rootDir') + '/node_modules/socket.io-client/node_modules/xmlhttprequest').XMLHttpRequest = function(){
        originalRequest.apply(this, arguments);
        this.setDisableHeaderCheck(true);
        var stdOpen = this.open;
        /*
         * I will patch now open in order to set my cookie from the jar request.
         */
        this.open = function() {
            stdOpen.apply(this, arguments);
            var header = jar.getCookieString(url);
            this.setRequestHeader('cookie', header);
        };
    };
    request.post({
        jar: jar,
        url: url + '/login',
        form: credentials
    }, function (err, res){
        next(ioc.connect(url));
    });
};
module.exports.getAuthenticatedSocketClient = getAuthenticatedSocketClient;

