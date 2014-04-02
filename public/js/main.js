require.config({
    paths: {
        "jquery": "lib/jquery-2.1.0.min",
        "jqueryui": "lib/jquery-ui-1.10.3.custom",
        "bootstrap": "lib/bootstrap.min",
        "underscore": "lib/underscore-min",
        "typeahead": "lib/bootstrap3-typeahead.min",
        "upload": "upload",
        "sockets": "sockets",
    },
    shim: {
        "bootstrap": ["jquery"],
        "typeahead": ["jquery"],
        "jqueryui": ["jquery"]
    }
});

define([
    "jquery",
    "underscore",
    "sockets",
    "bootstrap",
    "typeahead"
], function($, _, socket) {

    var cities = {};
    function fetchCity(api, query, callback) {
        $.ajax({
            url: api + "?name=~" + query,
            dataType: "json",
            success: function (data) {
                var result = _.map(data, function(d) {
                    if (!!d.name) cities[d.name] = d._id;
                    return d.name;
                });
                result = _.uniq(result);
                callback(result);
            }
        });
    };

    var restaurants = {};
    function fetchRestaurant(api, query, callback) {
        var cityQuery = !!cities[$('#city').val()] ? "&_city=" + cities[$('#city').val()] : "";
        $.ajax({
            url: api + "?name=~" + query + cityQuery,
            dataType: "json",
            success: function (data) {
                var result = _.map(data, function(d) {
                    if (!!d.name) restaurants[d.name] = d._id;
                    return d.name;
                });
                result = _.uniq(result);

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
        if(!!$('#upload').length) {
            require(['upload']);
        }

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

    });
});
