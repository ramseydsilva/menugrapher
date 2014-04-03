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
    console.log(dir);
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
                    console.log('entering waterfall');
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
        console.log(results);
        next(err, { city: results[0][0], restaurant: results[0][1], category: results[1], item: results[0][2] });
    });
};

PostHelpers.newPost = function(postData, socket, elementId, callback) {
    var newPost = new Post(postData);
    newPost.save(function(err, newPost, numberAffected) {

        Post.findOne({_id: newPost._id}).populate('_category').populate('_city').populate('_restaurant').exec(function(err, post) {
            // Generate post html to send to client
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

                callback(err, post);

            });
        });
    });
};

module.exports = PostHelpers;
