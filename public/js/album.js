require.config({
    paths: {
        "jquery": "lib/jquery-2.1.0.min",
        "underscore": "lib/underscore-min",
        "sockets": "sockets",
    },
    shim: {
        "bootstrap": ["jquery"]
    }
});

define([
    "jquery",
    "underscore",
    "sockets",
], function($, _, socket) {

    $(document).ready(function() {

        $('.album-update').on('click', function(e) {
            socket.emit('album-update', {
                id: $('.album').get(0).id,
                name: $('#album-name').val(),
                city: $('#city').val(),
                restaurant: $('#restaurant').val(),
                category: $('#category').val(),
                description: $('#description').val(),
                applyToPost: e.currentTarget.hasAttribute('applyToPost')
            });
        });

        $('.album-delete').on('click', function(e) {
            socket.emit('album-delete', {
                id: $('.album').get(0).id,
                deletePics: $(e.currentTarget).attr('deletePics')
            });
        });

    });
});
