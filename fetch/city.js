'use strict';

var googleplaces = require('googleplacesapi'),
    app = require('../app'),
    gp = new googleplaces({key: app.secrets.google.serverKey}),
    fetch = {};

fetch.getLatLng = function(city, force, callback) {
    if (!callback) {
        callback = force;
        force = false;
    }
    if (force || !city.location || !city.location.latitude || !city.location.longitude) {
        gp.text({query: city.name}, function(err, res) {
            if (!err) {
                var result = res.results[0];
                city.location.latitude = result.geometry.location.lat;
                city.location.longitude = result.geometry.location.lng;
                city.save(callback);
            } else {
                if (!!callback) callback(null, city);
            }
        });
    } else {
        if (!!callback) callback(null, city);
    }
}

module.exports = fetch;
