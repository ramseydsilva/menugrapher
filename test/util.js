'use strict';

process.env['MONGODB'] = 'mongodb://localhost:27017/mytestdb';
process.env.PORT = 4000;

var async = require('async'),
    ioc = require('socket.io-client'),
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

// creates a socket.io client for the given server
var getSocketClient = function (srv, nsp, opts){
    if ('object' == typeof nsp) {
        opts = nsp;
        nsp = null;
    }
    var addr = srv.address();
    if (!addr) addr = srv.listen().address();
    var url = 'ws://' + addr.address + ':' + addr.port + (nsp || '');
    return ioc.connect(url, opts);
}
module.exports.getSocketClient = getSocketClient;

