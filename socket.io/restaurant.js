'use strict';

var Restaurant = require('../models/restaurant'),
    _ = require('underscore'),
    fetch = require('../fetch/restaurant'),
    restaurantSocket = {};

restaurantSocket.googlePlaceApi = function(socket) {
    socket.on('googlePlacesSearch', function(data) {
        fetch.save({id: data.id, name: data.name, city: data.city, res: data.res}, 'googlePlacesSearch', function(err, res) {
            socket.emit('restaurant-info', [{}]);
        });
    });

    socket.on('googlePlacesDetail', function(data) {
        fetch.save({id: data.id, name: data.name, city: data.city, res: data.res}, 'googlePlacesDetail', function(err, res) {
            socket.emit('restaurant-info', [{}]);
        });
    });
};

restaurantSocket.socket = function(io, socket, app) {
    restaurantSocket.googlePlaceApi(socket);
};

module.exports = restaurantSocket; 
