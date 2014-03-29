require.config({
    paths: {
        "jquery": "lib/jquery-2.1.0.min",
        "bootstrap": "lib/bootstrap.min",
        "underscore": "lib/underscore-min",
        "socket.io": "/socket.io/socket.io",
        "socket.io-stream": "lib/socket.io-stream"
    },
    shim: {
        "bootstrap": ["jquery"]
    }
});

define([
    "jquery",
    "underscore",
    "socket.io",
    "socket.io-stream",
    "bootstrap"
], function($, _, io, ss) {
    var socket = io.connect('//' + window.location.host);

    socket.on('error', function (reason){
      console.error('Unable to connect Socket.IO', reason);
    });

    socket.on('connect', function (data){
        console.info('successfully established a working connection \o/');

        $('[room]').each(function(index, roomItem) {
            socket.emit("subscribe", { room: $(roomItem).attr('room') });
        });

        var handleSocketEvent = function(data) {
            switch(data.action) {
                case "redirect":
                    window.location = data.url;
                    break;
                case "html":
                    _.each(data.elements, function(value, key) {
                        $(key).html(value);
                    });
                    break;
                case "append":
                    _.each(data.elements, function(value, key) {
                        $(key).append(value);
                    });
                    break;
            }
        }

        socket.on('post-update', handleSocketEvent);
        socket.on("image-upload-complete", handleSocketEvent);

    });

    $(document).ready(function() {
        $(document).keyup(function(e) {
            if ($('#back').length && e.keyCode == 27) {
                window.location = $('#back').attr('href');
            }
        });

        function getProgressBar() {
            var elementId = Math.floor((Math.random()*10000000000000000)+1); // Generate random id
            var uploadBox = $('<div class="upload_box" id="' + elementId + '"></div>');
            var progressBar = $('<div class="progress progress-info progress-striped active"><div class="progress-bar"></div></div>');
            uploadBox.html(progressBar);
            $('#uploads').append(uploadBox);
            return progressBar;
        }

        $('#upload').on('click', function(e){
            e.preventDefault();
            _.each($("#image")[0].files, function(file) {
                var progressBar = getProgressBar(),
                    stream = ss.createStream(),
                    blobStream = ss.createBlobReadStream(file),
                    size = 0;
                ss(socket).emit('image-upload', stream, { elementId: progressBar.parent()[0].id, name: file, size: file.size });
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
                    ss(socket).emit('image-upload', stream, { elementId: progressBar.parent()[0].id, link: $(image_input).val() });
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
                description: $('.post-description').val()
            });
        });
    });
});
