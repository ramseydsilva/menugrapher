'use strict';

var Restaurant = require('../models/restaurant'),
    _ = require('underscore'),
    postHelpers = require('../helpers/post'),
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

    socket.on('newCity', function(data) {
        console.log('got event');
        postHelpers.getOrCreateCityRestaurantCategoryItem(data.name, "", "", "", function(err, res) {
            if (!!data.lat && !!data.lng) {
                var city = res.city;
                if (!city.location || !city.location.latitude) {
                    city.location.latitude = data.lat;
                    city.location.longitude = data.lng;
                    city.save();
                }
            }
        });
    });
};

restaurantSocket.socket = function(io, socket, app) {
    restaurantSocket.googlePlaceApi(socket);
};

module.exports = restaurantSocket; 
