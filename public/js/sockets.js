require.config({
    paths: {
        "jquery": "lib/jquery-2.1.0.min",
        "underscore": "lib/underscore-min",
        "socket.io": "/socket.io/socket.io",
        "socket.io-stream": "lib/socket.io-stream"
    },
    shim: {
    }
});

define([
    "jquery",
    "underscore",
    "socket.io",
    "socket.io-stream"
], function($, _, io, ss) {

    var socket = io.connect('//' + window.location.host);

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
                case "before":
                    _.each(data.elements, function(value, key) {
                        $(key).before(value);
                        subscribeElements($('<div>'+value+'</div>').find('[room]'));
                    });
                    break;
                case "after":
                    _.each(data.elements, function(value, key) {
                        $(key).after(value);
                        subscribeElements($('<div>'+value+'</div>').find('[room]'));
                    });
                    break;
                case "val":
                    _.each(data.elements, function(value, key) {
                        $(key).val(value);
                    });
                    break;
            }
        });
    };
 
    socket.on('error', function (reason){
      console.error('An unhandled error has occured with the socket. ', reason);
    });

    socket.on('connect', function (data){
        subscribeElements($('[room]'));
        socket.on('post-update', handleSocketEvent);
        socket.on('create-album', handleSocketEvent);
        socket.on('album-update', handleSocketEvent);
        socket.on('album-delete', handleSocketEvent);
        socket.on('restaurant-info', handleSocketEvent);
    });

    socket.ss = ss;

    return socket;

});

