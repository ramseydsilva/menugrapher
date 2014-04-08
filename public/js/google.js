require.config({
    paths: {
        "jquery": "lib/jquery-2.1.0.min",
        "async": "lib/requirejs/plugins/async",
        "underscore": "lib/underscore-min",
        "sockets": "sockets"
    },
    shim: {
    }
});

define([
    "jquery",
    "sockets",
    "underscore"
], function($, socket, _) {

    $(document).ready(function() {
        if (typeof restaurantPage != "undefined") {
            var latLng = new google.maps.LatLng(restaurant.location.latitude, restaurant.location.longitude);
            var mapOptions = {
                center: latLng,
                zoom: 14,
                mapTypeControlOptions: {
                    mapTypeIds: [google.maps.MapTypeId.ROADMAP]
                }
            };
            var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
            var marker = new google.maps.Marker({
                position: latLng,
                map: map,
                title: restaurant.name
            });
            var service = new google.maps.places.PlacesService(map);
            var request = {
                location: latLng,
                radius: '1000',
                types: ['restaurant'],
                keyword: restaurant.name
            }
            if (fetch) {
                service.nearbySearch(request, function(searches, status) {
                    if (status == google.maps.places.PlacesServiceStatus.OK) {
                        _.each(searches, function(search) {
                            socket.emit('googlePlacesSearch', {
                                id: restaurant.id,
                                name: search.name,
                                city: search.vicinity.split(', ')[1],
                                res: search 
                            });

                            service.getDetails(search, function(detail, status) {
                                if (status == google.maps.places.PlacesServiceStatus.OK) {
                                    socket.emit('googlePlacesDetail', {
                                        id: restaurant.id,
                                        name: detail.name,
                                        city: search.vicinity.split(', ')[1],
                                        res: detail
                                    });
                                }
                            });
                        });
                    }
                });
            }
        }
    });
});
