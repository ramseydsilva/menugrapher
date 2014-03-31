'use strict';

var fs = require('fs'),
    async = require('async'),
    ss = require('socket.io-stream'),
    post = require('../models/post'),
    city = require('../models/city'),
    category = require('../models/category'),
    restaurant = require('../models/restaurant'),
    formidable = require('formidable'),
    path = require('path'),
    moment = require('moment'),
    jade = require('jade'),
    util = require('util');

exports.posts = function(req, res) {
    var breadcrumbs = [
        { text: 'Dashboard', url: '/dashboard', class: ''},
        { text: 'Posts', url: '/posts/', class: 'active'},
    ];

    post.find().sort('-_id').exec(function(err, posts){
        res.render('post/posts', {
            title: "Posts",
            breadcrumbs: breadcrumbs,
            posts: posts
        });
    });
};

exports.new = function(req, res) {
    var breadcrumbs = [
        { text: 'Dashboard', url: '/dashboard', class: ''},
        { text: 'Posts', url: '/posts/', class: ''},
        { text: 'New', url: '/post/new', class: 'active'}
    ];

    res.render('post/newPost', {
        title: 'New Post',
        breadcrumbs: breadcrumbs
    });
};

exports.post = function(req, res) {
    var breadcrumbs = [
        { text: 'Dashboard', url: '/dashboard', class: ''},
        { text: 'Posts', url: '/posts/', class: ''},
        { text: res.locals.post.title, url: res.locals.post.url, class: 'active'}
    ];
    console.log("in controller", res.locals.post._restaurant);
    res.render('post/post', {
        title: "Post",
        breadcrumbs: breadcrumbs,
        post: res.locals.post,
        userHasRights: res.locals.post.userHasRights(req.user),
        time: moment(res.locals.post.createdAt).fromNow()
    });
};

exports.edit = function(req, res) {
    var breadcrumbs = [
        { text: 'Dashboard', url: '/dashboard', class: ''},
        { text: 'Posts', url: '/posts/', class: ''},
        { text: res.locals.post.title, url: res.locals.post.url, class: ''},
        { text: 'Edit', url: res.locals.post.editUrl, class: 'active'}
    ];

    var city = !!res.locals.post._city ? res.locals.post._city.name : '';
    var category = !!res.locals.post._category ? res.locals.post._category.name : '';
    var restaurant = !!res.locals.post._restaurant ? res.locals.post._restaurant.name : '';

    res.render('post/edit', {
        title: "Edit Post",
        breadcrumbs: breadcrumbs,
        post: res.locals.post,
        city: city,
        category: category,
        restaurant: restaurant,
        back: {
            text: 'Back to Post',
            href: res.locals.post.url
        }
    });
};

exports.delete = function(req, res) {
    var breadcrumbs = [
        { text: 'Dashboard', url: '/dashboard', class: ''},
        { text: 'Posts', url: '/posts/', class: ''},
        { text: res.locals.post.title, url: res.locals.post.url, class: ''},
        { text: 'Delete', url: res.locals.post.deleteUrl, class: 'active'}
    ];

    res.render('post/delete', {
        title: "Delete Post",
        breadcrumbs: breadcrumbs,
        post: res.locals.post,
        back: {
            text: 'Back to Post',
            href: res.locals.post.url
        }
    });
};

exports.deletePost = function(req, res) {
    res.locals.post.remove(function(err, post) {
        if (err) res.redirect(post.deleteUrl);  // TODO: Handle error
        req.app.emit('post:remove', post);
        res.redirect(req.body.redirect);
    });
};

var getOrCreateCityRestaurantCategory = function(cityName, restaurantName, categoryName, next) {
    async.parallel([
        function(next) {
            async.waterfall([
                function(next) {
                    city.findOrCreate({name: cityName}, function(err, doc) {
                        next(err, doc);
                    });
                },
                function(city, next) {
                    restaurant.findOrCreate({name: restaurantName}, function(err, doc) {
                        next(err, {city: city, restaurant: doc});
                    });
                }
            ], function(err, results) {
                // If restaurant is not assigned city, assign it now
                if (!!results.city && !!results.restaurant && !!!results.restaurant._city) {
                    results.restaurant._city = results.city.id;
                    results.restaurant.save(function(err, doc){
                        next(err, [results.city, doc]); // If we don't do this then the rest doesn't get saved to post
                    });
                } else {
                    next(err, [results.city, results.restaurant]);
                }
            });
        },
        function(next) {
            category.findOrCreate({name: categoryName}, function(err, doc) {
                next(err, doc);
            });
        }
    ], function(err, results) {
        next(err, {city: results[0][0], restaurant: results[0][1], category: results[1]});
    });
};

// Enables socket connection for post methods
module.exports.respond = function(app, socket) {

    app.on('post:remove', function(post) {
        var elements = {};
        elements['#' + post._id] = 'Post deleted';

        socket.to('post-' + post._id).emit('post-remove', [{
            action: 'html',
            elements: elements
        }]);
    });

    socket.in('post').on('post-update', function(data) {
        post.findOne({ _id: data.id }, function(err, post) {
            async.parallel([
                function(next) {
                    getOrCreateCityRestaurantCategory(data.city, data.restaurant, data.category, next);
                }
            ], function(err, results) {
                console.log(results);
                console.log(results[0].restaurant.id);
                post.title = data.title;
                post.description = data.description;
                post._city = results[0].city.id;
                post._category = results[0].category.id;
                post._restaurant = results[0].restaurant.id;
                console.log(post._restaurant);

                post.save(function(err, post, numberAffected) {
                    console.log('After saving rest value disappears?', post._restaurant);
                    socket.in('post-'+ post.id).emit('post-update', [{
                        action: 'redirect',
                        url: post.url
                    }]);  // Emit to emitting socket, get them to redirect to post page on successful edit

                    var elementsToUpdate = {};
                    elementsToUpdate['#' + post.id + ' .post-title'] = post.title;
                    elementsToUpdate['#' + post.id + ' .post-description'] = post.description;

                    socket.broadcast.to('post-' + post.id).emit('post-update', [{
                        action: 'html',
                        elements: elementsToUpdate
                    }]);  // Emit to other sockets to update their info
                });
            });
        });
    });

    var savePost = function(postData, elementId) {
        var newPost = new post(postData);
        newPost.save(function(err, newPost, numberAffected) {
            console.log("New post saved");

            // Generate post html to send to client
            fs.readFile(path.join(app.get('views'), 'includes/post.jade'), 'utf8', function (err, data) {
                if (err) throw err;

                var elementsToUpdate = {},
                    fn = jade.compile(data),
                    postHtml = fn({ 
                        post: newPost,
                        user: socket.handshake.user,
                        showOptionsAlways: true,
                        cols: 3,
                        target: 'blank'
                    });

                elementsToUpdate['#' + elementId] = postHtml;
                socket.emit("image-upload-complete", [{
                    action: 'replaceWith',
                    elements: elementsToUpdate
                }]);
            });
        });
    };

    var getExtension = function(filename) {
        var ext = path.extname(filename||'').split('.');
        return ext[ext.length - 1];
    }

    function increment_last(v) {
        return v.replace(/[0-9]+(?!.*[0-9])/, function(match) {
            return parseInt(match, 10)+1;
        });
    }

    // Takes in filename, user and returns callback with error, results
    var getFilePath = function(filename, user, next) {
        var userDir = path.join(app.get('rootDir'), '/public/uploads/' + user.id);
        var originalDir = userDir + '/original';
        async.series([
            function(next) {
                fs.mkdir(userDir, function(err) {
                    next(null, err);
                });
            },
            function(next) {
                fs.mkdir(originalDir, function(err) {
                    next(null, err);
                });
            },
            function(next) {
                var filepath = originalDir + '/' + filename;
                fs.exists(filepath, function(exists) {
                    if (exists) {
                        var ext = getExtension(filepath);
                        filepath = originalDir + '/' + increment_last(filename.replace('.'+ext, '')) + '.' + ext;
                    }
                    next(null, filepath);
                });
            }
        ], function(err, results) {
            return next(err, results[2]);
        });
    };

    // Takes image filepath and returns callback with image url
    var getImageUrl = function(filepath, next) {
        return next(filepath.split('public')[1].replace('//', '/'));
    }

    ss(socket).on('image-upload', function(stream, data) {
        var filename, elementId = data.elementId;

        if (!!data.link) {
            filename = path.basename(data.link).split('?')[0];
        } else {
            filename = path.basename(data.name.name);
        }

        async.waterfall([
            function(next) { // get file path
                getFilePath(filename, socket.handshake.user, function(err, filepath) {
                    next(null, filepath);
                });
            },
            function(filepath, next) { // get url
                getImageUrl(filepath, function(url){
                    next(null, filepath, url);
                });
            },
            function(filepath, url, next) { // start stream
                if (!!data.link) {
                    var http = require('http'),
                        https = require('https'),
                        download = fs.createWriteStream(filepath);

                    var httpProtocol = !data.link.indexOf('https') ? https : http;
                    var httpStream = httpProtocol.get(data.link, function(res) {
                        res.pipe(download);
                        var totalSize = res.headers['content-length'];
                        var downloadedSize = 0;
                        res.on('data', function(buffer) {
                            downloadedSize += buffer.length;
                            socket.emit('downloadProgress', {'progress': downloadedSize/totalSize * 100 + '%' });
                        });
                    });
                    download.on('finish', function(err, data) { 
                        next(err, filepath, url, elementId);
                    });
                } else {
                    var upload = fs.createWriteStream(filepath);
                    stream.pipe(upload);
                    stream.on('end', function(err, data) {
                        next(err, filepath, url, elementId);
                    });
                }
            }
        ], function(err, filepath, url, elementId) {

            // Create city, restaurant, category first before saving post
            async.parallel([
                function(next) {
                    getOrCreateCityRestaurantCategory(data.city, data.restaurant, data.category, next);
                }
            ], function(err, results) {
                console.log(results);
                savePost({
                    user: {
                        uid: socket.handshake.user.id,
                        name: socket.handshake.user.profile.name
                    },
                    pic: {
                        originalPath: filepath,
                        originalUrl: url,
                        thumbPath: "",
                        thumbUrl: "",
                    },
                    _city: results[0].city.id,
                    _restaurant: results[0].restaurant.id,
                    _category: results[0].category.id
                }, elementId);
            });

        });
    });

}
