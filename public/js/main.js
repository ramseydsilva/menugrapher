require.config({
    paths: {
        "jquery": "lib/jquery-2.1.0.min",
        "jqueryui": "lib/jquery-ui-1.10.3.custom",
        "bootstrap": "lib/bootstrap.min",
        "underscore": "lib/underscore-min",
        "typeahead": "lib/bootstrap3-typeahead.min",
        "socket.io": "/socket.io/socket.io",
        "socket.io-stream": "lib/socket.io-stream",
        "packery": "lib/packery.pkgd.min",
    },
    shim: {
        "bootstrap": ["jquery"],
        "typeahead": ["jquery"],
        "jqueryui": ["jquery"],
        "packery": ["jquery", "jqueryui"]
    }
});

define([
    "jquery",
    "underscore",
    "socket.io",
    "socket.io-stream",
    "bootstrap",
    "typeahead"
], function($, _, io, ss) {
    var socket = io.connect('//' + window.location.host);

    socket.on('error', function (reason){
      console.error('Unable to connect Socket.IO', reason);
    });

    var subscribeElements = function(elements) {
        elements.each(function(index, roomItem) {
            if (!!$(roomItem).attr('room')) {
                socket.emit("subscribe", { room: $(roomItem).attr('room') });
            }
        });
    };

    var handleSocketEvent = function(actions) {
        // An array of events are sent to the client, instructing on what task to perform
        _.each(actions, function(data) {
            switch(data.action) {
                case "redirect":
                    window.location = data.url;
                    break;
                case "html":
                    _.each(data.elements, function(value, key) {
                        $(key).html(value);
                        subscribeElements($('<div>'+value+'</div>').find('[room]'));
                    });
                    break;
                case "append":
                    _.each(data.elements, function(value, key) {
                        $(key).append(value);
                        subscribeElements($('<div>'+value+'</div>').find('[room]'));
                    });
                    break;
                case "replaceWith":
                    _.each(data.elements, function(value, key) {
                        $(key).replaceWith(value);
                        subscribeElements($('<div>'+value+'</div>').find('[room]'));
                    });
                    break;
                case "remove":
                    _.each(data.elements, function(value, key) {
                        $(key).remove();
                        // TODO unsubscribe
                    });
                case "after":
                    _.each(data.elements, function(value, key) {
                        $(key).after(value);
                    });
                    break;
            }
        });
    };

    socket.on('connect', function (data){
        console.info('successfully established a working connection \o/');
        subscribeElements($('[room]'));
        socket.on('post-update', handleSocketEvent);
    });

    function getProgressBar() {
        var elementId = Math.floor((Math.random()*10000000000000000)+1); // Generate random id
        var uploadBox = $('<div class="col-sm-3 upload_box" id="' + elementId + '"></div>');
        var progressBar = $('<div class="progress progress-info progress-striped active"><div class="progress-bar"></div></div>');
        uploadBox.html(progressBar);

        $('#uploads').append(uploadBox);
        if($('#uploads .upload_box, #uploads .post-box').length % 4 == 0)
            $('#uploads').append('<div class="clearfix"></div>');

        return progressBar;
    }

    var cities = {};
    function fetchCity(api, query, callback) {
        $.ajax({
            url: api + "?name=~" + query,
            dataType: "json",
            success: function (data) {
                var result = _.map(data, function(d) {
                    cities[d.name] = d._id;
                    return d.name;
                });
                callback(result);
            }
        });
    };

    function fetchRestaurant(api, query, callback) {
        var cityQuery = !!cities[$('#city').val()] ? "&_city=" + cities[$('#city').val()] : "";
        $.ajax({
            url: api + "?name=~" + query + cityQuery,
            dataType: "json",
            success: function (data) {
                var result = _.map(data, function(d) {
                    return d.name;
                });
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
                callback(result);
            }
        });
    };

    $(document).ready(function() {

        $(document).keyup(function(e) {
            if ($('#back').length && e.keyCode == 27) {
                window.location = $('#back').attr('href');
            }
        });

        $('#upload').on('click', function(e){
            e.preventDefault();
            _.each($("#image")[0].files, function(file) {
                var progressBar = getProgressBar(),
                    stream = ss.createStream(),
                    blobStream = ss.createBlobReadStream(file),
                    size = 0;
                ss(socket).emit('image-upload', stream, { 
                    elementId: progressBar.parent()[0].id,
                    name: file,
                    size: file.size,
                    city: $('#city').val(),
                    restaurant: $('#restaurant').val(),
                    category: $('#category').val()
                });
                blobStream.on('data', function(chunk) {
                    size += chunk.length;
                    progressBar.find('.progress-bar').css("width", Math.floor(size / file.size * 100) + '%');
                });
                blobStream.pipe(stream);
            });
            // Clear input values
            var newInput = $('#image').clone();
            $('#image').replaceWith(newInput);

            // Grab image from url input
            $('.image-url').each(function(index, image_input) {
                if(!!$(image_input).val()) {
                    var progressBar = getProgressBar(),
                        stream = ss.createStream(),
                        size = 0;
                    ss(socket).emit('image-upload', stream, {
                        elementId: progressBar.parent()[0].id,
                        link: $(image_input).val(),
                        city: $('#city').val(),
                        restaurant: $('#restaurant').val(),
                        category: $('#category').val()
                    });
                    socket.on('downloadProgress', function(data) {
                        progressBar.find('.progress-bar').css('width', data.progress);
                    });
                    $(image_input).val('');
                }
            });
        });

        $('.post-update').on('click', function(e) {
            socket.emit('post-update', {
                id: $('.post').get(0).id,
                title: $('.post-title').val(),
                description: $('.post-description').val(),
                city: $('#city').val(),
                restaurant: $('#restaurant').val(),
                category: $('#category').val()
            });
        });

        $('body').on('click', '.post-remove', function(e) {
            socket.emit('post:remove', {
                id: $(e.target).attr('post')
            });
        });

        $('#uploads').on('click', 'a.remove-category', function(e) {
            socket.emit('post._category:remove', {
                id: $(e.target).attr('post')
            });
        });

        $('#uploads').on('click', 'a.remove-city', function(e) {
            socket.emit('post._city:remove', {
                id: $(e.target).attr('post')
            });
        });

        $('#uploads').on('click', 'a.remove-restaurant', function(e) {
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

    });
});
