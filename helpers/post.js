'use strict';

var fs = require('fs'),
    _ = require('underscore'),
    app = require('../app'),
    mkdirp = require('mkdirp'),
    jade = require('jade'),
    city = require('../models/city'),
    Restaurant = require('../models/restaurant'),
    category = require('../models/category'),
    item = require('../models/item'),
    async = require('async'),
    path = require('path'),
    Post = require('../models/post'),
    PostHelpers = {};


PostHelpers.getExtension = function(filename) {
    var ext = path.extname(filename||'').split('.');
    return ext[ext.length - 1];
};

PostHelpers.getUniquePath = function(filepath, next) {
    var filename = path.basename(filepath);
    fs.exists(filepath, function(exists) {
        if (exists) {
            var ext = PostHelpers.getExtension(filepath);
            var fileNoExt = filename.replace('.' + ext, '');
            PostHelpers.getUniquePath(filepath.replace(fileNoExt, Math.floor((Math.random()*100000000000))), next);
        } else {
            next(filepath);
        }
    });
};

// Takes in filename, user and returns callback with error, results
PostHelpers.getFilePath = function(filename, directory, user, callback) {
    var userDir = path.join(app.get('rootDir'), '/public/uploads/' + user.id);
    var dir = userDir + '/' + directory;
    async.series([
        function(next) {
            mkdirp(dir, function(err) {
                next(err);
            });
        },
        function(next) {
            var filepath = dir + '/' + filename;
            PostHelpers.getUniquePath(filepath, function(filepath) {
                next(null, filepath);
            });
        }
    ], function(err, results) {
        return callback(err, results[1]);
    });
};

// Takes image filepath and returns callback with image url
PostHelpers.getImageUrl = function(filepath, next) {
    return next(filepath.split('public')[1].replace('//', '/'));
};

PostHelpers.getOrCreateCityRestaurantCategoryItem = function(cityName, restaurantName, categoryName, itemName, next) {
    async.parallel([
        function(next) {
            async.waterfall([
                function(next) {
                    city.findOneAndUpdate({ name: cityName }, {}, {upsert: true}, function(err, doc) {
                        if (err) throw err;
                        next(err, doc);
                    });
                },
                function(city, next) {
                    Restaurant.findOneAndUpdate({ name: restaurantName, _city: city._id }, {}, {upsert: true}, function(err, doc) {
                        if (err) throw err;
                        next(err, city, doc);
                    });
                },
                function(city, restaurant, next) {
                    item.findOneAndUpdate({ name: itemName, _restaurant: restaurant._id }, {}, {upsert: true}, function(err, doc) {
                        if (err) throw err;
                        Restaurant.update({_id: restaurant._id}, { $addToSet: {menu: doc._id }}, function(err, _) {
                            if (err) throw err;
                            next(err, { city: city, restaurant: restaurant, item: doc });
                        });
                    });
                }
            ], function(err, results) {
                next(err, [results.city, results.restaurant, results.item ]);
            });
        },
        function(next) {
            category.findOneAndUpdate({ name: categoryName }, {}, {upsert: true}, function(err, doc) {
                next(err, doc);
            });
        }
    ], function(err, results) {
        next(err, { city: results[0][0], restaurant: results[0][1], category: results[1], item: results[0][2] });
    });
};

PostHelpers.socketNewPost = function(post, elementId, socket, callback) {
    async.waterfall([
        function(next) {
            if (!post._city.name || !post._restaurant.name || !post._category.name) {
                // Populate attrs
                Post.findOne({_id: post._id}).populate('_category').populate('_city').populate('_restaurant').exec(function(err, post) {
                    next(err, post);
                });
            } else {
                next(null, post);
            }
        },
        function(post, next) {
            fs.readFile(path.join(app.get('views'), 'includes/postEdit.jade'), 'utf8', function (err, data) {
                if (err) throw err;

                var elementsToUpdate = {},
                    fn = jade.compile(data),
                    postHtml = fn({ 
                        post: post,
                        cols: 3,
                        target: '_blank'
                    });

                elementsToUpdate['#' + elementId] = postHtml;
                socket.emit("post-update", [{
                    action: 'replaceWith',
                    elements: elementsToUpdate
                }]);

                next(err, post);
            });
        }
    ], callback);
};

PostHelpers.newPost = function(postData, socket, elementId, callback) {
    var newPost = new Post(postData);
    newPost.save(function(err, newPost) {
        PostHelpers.socketNewPost(newPost, elementId, socket, callback);
    });
};

/**
 * Updates post info (title, description, city, category, restaurant, item
 *
 * @method updatePost
 * @async
 */
PostHelpers.updatePost = function(post, opts, socket, page, callback) {

    Post.findOneAndUpdate({_id: post._id}, opts, function(err, post) {
        if (page == 'post') {
            // Emit to socket instructing refresh only if on post page
            socket.emit('post-update', [{
                action: 'redirect',
                url: post.url
            }]);
        }

        // All other clients with this post should update their info
        var elementsToUpdate = {};
        elementsToUpdate['#' + post.id + ' .post-title'] = post.title;
        elementsToUpdate['#' + post.id + ' .post-description'] = post.description;
        elementsToUpdate['#' + post.id + ' ._city'] = post._city.name;
        elementsToUpdate['#' + post.id + ' ._restaurant'] = post._restaurant.name;
        elementsToUpdate['#' + post.id + ' ._category'] = post._category.name;

        socket.broadcast.to('post-' + post.id).emit('post-update', [{
            action: 'html',
            elements: elementsToUpdate
        }]);

        if (!!callback)
            callback(err, post);

    });

};

module.exports = PostHelpers;
