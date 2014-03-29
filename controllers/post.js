'use strict';

var fs = require('fs'),
    ss = require('socket.io-stream'),
    post = require('../models/post'),
    formidable = require('formidable'),
    path = require('path'),
    util = require('util');

exports.new = function(req, res) {
    post.find(function(err, posts) {
        res.render('post/newPost', {
            title: 'New Post'
        });
    });
}

exports.post = function(req, res) {
    res.render('post/post', {
        title: "Post",
        post: res.locals.post
    });
};

exports.edit = function(req, res) {
    res.render('post/edit', {
        title: "Edit Post",
        post: res.locals.post 
    });
}

// Enables socket connection for post methods
exports.socketio = function(app) {

    app.socketio.on('connection', function(socket){ 

        socket.in('post').on('post-update', function(data) {
            post.findOne({ _id: data.id }, function(err, post) {
                post.title = data.title;
                post.description = data.description;
                post.save(function(err, post, numberAffected) {
                    socket.in('post-'+ post.id).emit('post-update', {
                        action: 'redirect',
                        url: post.url
                    });  // Emit to emitting socket, get them to redirect to post page on successful edit

                    var elementsToUpdate = {};
                    elementsToUpdate['#' + post.id + ' .post-title'] = post.title;
                    elementsToUpdate['#' + post.id + ' .post-description'] = post.description;

                    socket.broadcast.to('post-' + post.id).emit('post-update', {
                        action: 'html',
                        elements: elementsToUpdate
                    });  // Emit to other sockets to update their info
                });
            });
        });

        var filepath, url, elementId;
        var savePost = function() {
            var postData = {
                user: {
                    uid: socket.handshake.user.id,
                    name: socket.handshake.user.profile.name
                },
                pic: {
                    originalPath: filepath,
                    originalUrl: url,
                    thumbPath: "",
                    thumbUrl: "",
                }
            };
            var newPost = new post(postData);
            newPost.save(function(err, newPost, numberAffected) {
                console.log("New post saved");

                var elementsToUpdate = {};
                elementsToUpdate['#' + elementId] = '<a href="' + newPost.editUrl + '"><img class="container-full" src="' + newPost.pic.originalUrl + '" /></a>';
                socket.emit("image-upload-complete", {
                    action: 'html',
                    elements: elementsToUpdate
                });
            });
        }

        ss(socket).on('image-upload', function(stream, data) {
            if (!!data.link) {
                var filename = path.basename(data.link).split('?')[0];
                filepath = path.join(app.rootDir, '/public/uploads/original/' + filename),
                url = '/uploads/original/' + filename;
                elementId = data.elementId;

                var http = require('http'),
                    https = require('https'),
                    download = fs.createWriteStream(filepath);
                var httpProtocol = !data.link.indexOf('https') ? https : http;
                download.on('open', function(fd) {
                    httpProtocol.get(data.link, function(res) {
                        res.pipe(download);
                    });
                });
                download.on('finish', savePost);
                stream.pipe(download);

            } else {
                var filename = path.basename(data.name.name);
                filepath = path.join(app.rootDir, '/public/uploads/original/' + filename),
                url = '/uploads/original/' + filename;
                elementId = data.elementId;
                stream.pipe(fs.createWriteStream(filepath));
                stream.on('end', savePost);
            }
        });

    });

}
