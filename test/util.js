'use strict';

var async = require('async'),
    nconf = require('nconf'),
    path = require('path'),
    fs = require('fs'),
    app = require('../app'),
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

var loadDb = function(loadData, done) {
    if (arguments.length == 1) {
        done = loadData;
        loadData = function(next) {
            next();
        };
    }

    function clearDB(next) {
        for (var i in mongoose.connection.collections) {
            mongoose.connection.collections[i].remove(function() {});
        }
        next(null);
    }

    async.series([
        function(next) {
            if (mongoose.connection.readyState === 0) {
                mongoose.connect(nconf.get('db:host') + ':' + nconf.get('db:port') + '/' + nconf.get('db:name'), function (err) {
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
module.exports.loadDb = loadDb;

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

var rmdir = function(dir) {
    var list = fs.readdirSync(dir);
    for(var i = 0; i < list.length; i++) {
        var filename = path.join(dir, list[i]);
        var stat = fs.statSync(filename);

        if(filename == "." || filename == "..") {
            // pass these files
        } else if(stat.isDirectory()) {
            // rmdir recursively
            rmdir(filename);
        } else {
            // rm fiilename
            fs.unlinkSync(filename);
        }
    }
    fs.rmdirSync(dir);
};
module.exports.rmdir = rmdir;

var after = function (done) {
    mongoose.disconnect();
    rmdir(path.join(__dirname + "/public/uploads"));
    fs.mkdirSync(path.join(__dirname, "public/uploads")); // Effectively empties the upload directory
    done();
};
module.exports.after = after;
