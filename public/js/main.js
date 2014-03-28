require.config({
    paths: {
        "jquery": "lib/jquery-2.1.0.min",
        "bootstrap": "lib/bootstrap.min",
        "socket.io": "/socket.io/socket.io",
        "socket.io-stream": "lib/socket.io-stream"
    },
    shim: {
        "bootstrap": ["jquery"]
    }
});

define([
    "jquery",
    "socket.io",
    "socket.io-stream",
    "bootstrap"
], function($, io, ss) {
    var stream = ss.createStream();

    var socket = io.connect('//' + window.location.host);

    socket.on('error', function (reason){
      console.error('Unable to connect Socket.IO', reason);
    });

    socket.on('connect', function (){
        console.info('successfully established a working connection \o/');
    });

    socket.on("image-upload-complete", function(data) {
        window.location = data.postUrl;
    });

    $(document).ready(function() {
        $('#upload').on('click', function(e){
            e.preventDefault();
            var file = $("#image")[0].files[0],
                blobStream = ss.createBlobReadStream(file),
                size = 0;
            ss(socket).emit('image-upload', stream, { name: file, size: file.size });
            blobStream.on('data', function(chunk) {
                size += chunk.length;
                $('#progress').css("width", Math.floor(size / file.size * 100) + '%');
            });
            blobStream.pipe(stream);
        });
    });
});
