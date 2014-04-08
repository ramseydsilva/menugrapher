'use strict';

var googleplaces = require('../googleplaces'),
    app = require('../app'),
    gp = new googleplaces(app.secrets.google.serverKey),
    fetch = {};

fetch.getLatLng = function(city, force, callback) {
    if (!callback) {
        callback = force;
        force = false;
    }
    if (force || !city.location || !city.location.latitude || !city.location.longitude) {
        gp.text({query: city.name}, function(err, res) {
            if (!err) {
                city.location.latitude = res[0].geometry.location.lat;
                city.location.longitude = res[0].geometry.location.lng;
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
