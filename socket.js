'use strict';

var fs = require('fs'),
    passportSocketIo = require("passport.socketio"),
    postRespond = require('./controllers/post').respond;

// To be instantiated once from app.js
module.exports.socketio = function(app) {

    // Listen to server
    var io = require('socket.io').listen(app.server),
        passportAuthorization = passportSocketIo.authorize({
            cookieParser: app.cookieParser,
            key:    'connect.sid',          // the cookie where express (or connect) stores its session id.
            secret: app.secrets.sessionSecret,               // the session secret to parse the cookie
            store:   app.sessionStore,          // the session store that express uses
            fail: function(data, err, someBool, accept) {
                console.log("Failed handshake");
                accept(null, true);        // second param takes boolean on whether or not to allow handshake
            },
            success: function(data, accept) {
                console.log("Successful handshake");
                accept(null, true);
            }
        });

    io.configure(function() {
        io.set("authorization", passportAuthorization);
    });

    io.on('connection', function(socket){ 
        postRespond(app, socket);

        socket.on('connect', function() {
            console.log("Socket connected");
        });

        socket.on('subscribe', function(data) {
            socket.join(data.room);
        });

        socket.on('disconnect', function(){
            console.log("Socket disconnected");
        });

    });

    return io;

}
