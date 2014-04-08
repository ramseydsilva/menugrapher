require.config({
    paths: {
        "jquery": "lib/jquery-2.1.0.min",
        "jqueryui": "lib/jquery-ui-1.10.3.custom",
        "jqueryui": "lib/jquery-ui-1.10.3.custom",
        "async": "lib/requirejs/plugins/async",
        "bootstrap": "lib/bootstrap.min",
        "underscore": "lib/underscore-min",
        "typeahead": "lib/bootstrap3-typeahead.min",
        "upload": "upload",
        "album": "album",
        "sockets": "sockets",
        "google": "google"
    },
    shim: {
        "bootstrap": ["jquery"],
        "typeahead": ["jquery"],
        "jqueryui": ["jquery"],
        "upload": ["sockets"]
    }
});

define([
    "jquery",
    "underscore",
    "sockets",
    "bootstrap",
    "typeahead",
    "google",
    "async!https://maps.googleapis.com/maps/api/js?libraries=places&key=AIzaSyAcUFm4EWVzRBcVYpoOY-shghCI9Qphq8A&sensor=true",
], function($, _, socket) {

    var cities = {},
        restaurants = {},
        restoResults = [],
        lat = 43.653226,
        lng = -79.3831843;

    if (typeof restaurant != "undefined" && typeof restaurant.location != "undefined" && typeof restaurant.location.longitude != "undefined"
        && !!restaurant.location.longitude) {
        lat = restaurant.location.latitude;
        long = restaurant.location.longitude;
    } else if (typeof city != "undefined" && typeof city.location != "undefined" && typeof city.location.longitude != "undefined"
        && !!city.location.longitude) {
        lat = city.location.latitude;
        lng = city.location.longitude
    }

    function weatherapiCitySearch(query, callback) {
       $.ajax({
            url: "http://api.openweathermap.org/data/2.5/find?type=like&q=" + query,
            dataType: "json",
            success: function (data) {
                if (data.cod == "200") {
                    callback(null, data);
                } else {
                    callback(new Error('no results returned'), null);
                }
            }
        });
    }

    function fetchCity(api, query, callback) {
        $.ajax({
            url: api + "?name=~" + query,
            dataType: "json",
            success: function (data) {
                var result = _.map(data, function(d) {
                    if (!!d.name) cities[d.name] = d._id;
                    if (!!d.location && !!d.location.latitude) lat = d.location.latitude;
                    if (!!d.location && !!d.location.longitude) lng = d.location.longitude;
                    return d.name;
                });
                result = _.uniq(result);
                callback(result);
            }
        });
    };
    if(!!$('#city').length) {
        fetchCity($('#city').attr('api'), $('#city').val(), function(){});
    }

    function googleRestaurantSearch(query, callback) {
         var myOptions = {
            center: new google.maps.LatLng(lat, lng)
         }
         var map = new google.maps.Map(document.getElementById('map'), myOptions);
         var places = new google.maps.places.PlacesService(map);
         var search = {
             radius: 15000,
             location: myOptions.center,
             types: ['food'],
             keyword: query
         }
         places.nearbySearch(search, function(results, status) {
             if (status == google.maps.places.PlacesServiceStatus.OK) {
                 callback(null, results);
             } else {
                 callback(new Error('no results returned'), null)
             }
         });
    }

    function fetchRestaurant(api, query, callback) {
        restoResults = [];
        googleRestaurantSearch(query, function(err, res) {
            if (!err) {
                _.map(res, function(r) {
                    var city = r.vicinity.split(', ')[r.vicinity.split(', ').length-1];
                    restoResults.push(r.name);
                    socket.emit('googlePlacesSearch', {
                        id: '',
                        name: r.name,
                        city: city,
                        res: r
                    });
                 });
            }
        });

        var cityQuery = !!cities[$('#city').val()] ? "&_city=" + cities[$('#city').val()] : "";

        $.ajax({
            url: api + "?name=~" + query + cityQuery,
            dataType: "json",
            success: function (data) {
                _.each(data, function(d) {
                    if (!!d.name) restaurants[d.name] = d._id;
                    restoResults.push(d.name);
                });

                var result = _.uniq(restoResults);

                if (!!callback)
                    callback(result);
            }
        });
    };

    if (!!$('#restaurant').length) fetchRestaurant($('#restaurant').attr('api'), $('#restaurant').val());
    function fetchItem(api, query, callback) {
        var restaurantQuery = !!restaurants[$('#restaurant').val()] ? "&_restaurant=" + restaurants[$('#restaurant').val()] : "";
        $.ajax({
            url: api + "?name=~" + query + restaurantQuery,
            dataType: "json",
            success: function (data) {
                var result = _.map(data, function(d) {
                    return d.name;
                });
                result = _.uniq(result);
                callback(result);
            }
        });
    };

    function fetchListItem(e, query, callback) {
        var api = e.$element.attr('api');
        var apiQuery = api + "?name=~" + query;
        var urlPrefix = 'cities'
        if (api.indexOf('restaurant') != -1) {
            if (!!city)
                apiQuery += '&_city=' + city.id; // city is specified as global var on this page
            urlPrefix = 'restaurants';
        } else if (api.indexOf('categor') != -1) {
            urlPrefix = 'categories';
        }
        $.ajax({
            url: apiQuery,
            dataType: "json",
            success: function (data) {
                var searchBox = e.$element.parent().parent();
                searchBox.find('.original').hide();
                searchBox.find('.search-results').show();
                searchBox.find('.search-results').empty();

                if (!!data) {
                    var result = _.map(data, function(d) {
                        searchBox.find('.search-results').append('<a class="list-group-item" href="/' + urlPrefix + '/' + d._id + '">' + d.name + '</a>');
                    });
                } else {
                    searchBox.find('.search-results').append('<a class="list-group-item">Search didn\'t return any results</a>');
                }

                if (api.indexOf('cities') != -1) {
                    weatherapiCitySearch(query, function(err, data) {
                        if (!err) {
                            _.map(data.list, function(c) {
                                if (c.name != "") {
                                    socket.emit('newCity', {
                                        lat: c.coord.lat,
                                        lng: c.coord.lon,
                                        name: c.name,
                                    });
                                }
                            });
                        }
                    });
                }

                if (api.indexOf('restaurant') != -1) {
                    googleRestaurantSearch(query, function(err, res) {
                        if (!err) {
                            _.map(res, function(r) {
                                var city = r.vicinity.split(', ')[r.vicinity.split(', ').length-1];
                                restoResults.push(r.name);
                                socket.emit('googlePlacesSearch', {
                                    id: '',
                                    name: r.name,
                                    city: city,
                                    _city: (!!city && !!city.id ? city.id : ''),
                                    res: r
                                });
                             });
                        }
                    });
                }

                if (query.length < 1) {
                    searchBox.find('.original').show();
                    searchBox.find('.search-results').hide();
                }
            }
        });
    };

    function fetchJson(api, query, callback) {
        $.ajax({
            url: api + "?name=~" + query,
            dataType: "json",
            success: function (data) {
                var result = _.map(data, function(d) {
                    return d.name;
                });
                result = _.uniq(result);
                callback(result);
            }
        });
    };

    $(document).ready(function() {

        // load upload script only if user is on upload page
        if(!!$('#upload').length) require(['upload']);
        if(!!$('.album-update, .album-delete').length) require(['album']);

        $('.post-update').on('click', function(e) {
            socket.emit('post-update', {
                id: $('.post').get(0).id,
                title: $('.post-title').val(),
                description: $('.post-description').val(),
                city: $('#city').val(),
                restaurant: $('#restaurant').val(),
                category: $('#category').val(),
                item: $('#item').val()
            });
        });

        $(document).keyup(function(e) {
            if ($('#back').length && e.keyCode == 27) {
                window.location = $('#back').attr('href');
            }
        });

        $('body').on('click', '.post-remove', function(e) {
            socket.emit('post:remove', {
                id: $(e.target).attr('post')
            });
        });

        $('body').on('click', 'a.remove-category', function(e) {
            socket.emit('post._category:remove', {
                id: $(e.target).attr('post')
            });
        });

        $('body').on('click', 'a.remove-city', function(e) {
            socket.emit('post._city:remove', {
                id: $(e.target).attr('post')
            });
        });

        $('body').on('click', 'a.remove-restaurant', function(e) {
            socket.emit('post._restaurant:remove', {
                id: $(e.target).attr('post')
            });
        });

        $('#city').typeahead({
            displayKey: "name",
            items: "all",
            autoSelect: false,
            source: function(query, callback) {
                fetchCity($('#city').attr('api'), query, callback);
            }
        });

        $('#restaurant').typeahead({
            displayKey: "name",
            items: "all",
            autoSelect: false,
            source: function(query, callback) {
                fetchRestaurant($('#restaurant').attr('api'), query, callback);
            }
        });

        $('#category').typeahead({
            displayKey: "name",
            items: "all",
            autoSelect: false,
            source: function(query, callback) {
                fetchJson($('#category').attr('api'), query, callback);
            }
        });

        $('#item').typeahead({
            displayKey: "name",
            items: "all",
            autoSelect: false,
            source: function(query, callback) {
                fetchItem($('#item').attr('api'), query, callback);
            }
        });

        $('.list-search').typeahead({
            displayKey: "name",
            items: "all",
            autoSelect: false,
            source: function(query, callback) {
                fetchListItem(this, query, callback);
            }
        });


    });
});
