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

    function createDeleteAlbum() {
        if (!!$('#createAlbum').length) {
            socket.emit('create-album', {
                album: $('#album').val(),
                create: $('#createAlbum')[0].checked
            });
        };
    };

    $(document).ready(function() {

        $(document).keyup(function(e) {
            if ($('#back').length && e.keyCode == 27) {
                window.location = $('#back').attr('href');
            }
        });

        createDeleteAlbum();
        $('#createAlbum').on('click', function(e) {
            createDeleteAlbum();
        });

        $('#upload').on('click', function(e){
            e.preventDefault();
            _.each($("#image")[0].files, function(file) {
                var progressBar = getProgressBar(),
                    stream = socket.ss.createStream(),
                    blobStream = socket.ss.createBlobReadStream(file),
                    size = 0;
                socket.ss(socket).emit('image-upload', stream, { 
                    elementId: progressBar.parent()[0].id,
                    name: file,
                    size: file.size,
                    city: $('#city').val(),
                    restaurant: $('#restaurant').val(),
                    category: $('#category').val(),
                    item: $('#item').val(),
                    album: $('#album').val()
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
                        stream = socket.ss.createStream(),
                        size = 0;
                    socket.ss(socket).emit('image-upload', stream, {
                        elementId: progressBar.parent()[0].id,
                        link: $(image_input).val(),
                        city: $('#city').val(),
                        restaurant: $('#restaurant').val(),
                        category: $('#category').val(),
                        item: $('#item').val(),
                        album: $('#album').val()
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
                category: $('#category').val(),
                item: $('#item').val()
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

    });

});
