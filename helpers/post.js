'use strict';

var fs = require('fs'),
    app = require('../app'),
    jade = require('jade'),
    city = require('../models/city'),
    restaurant = require('../models/restaurant'),
    category = require('../models/category'),
    async = require('async'),
    path = require('path'),
    Post = require('../models/post'),
    PostHelpers = {};


PostHelpers.getExtension = function(filename) {
    var ext = path.extname(filename||'').split('.');
    return ext[ext.length - 1];
};

PostHelpers.incrementLast = function(v) {
    return v.replace(/[0-9]+(?!.*[0-9])/, function(match) {
        return parseInt(match, 10)+1;
    });
};

// Takes in filename, user and returns callback with error, results
PostHelpers.getFilePath = function(filename, user, callback) {
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
                    var ext = PostHelpers.getExtension(filepath);
                    filepath = originalDir + '/' + PostHelpers.incrementLast(filename.replace('.'+ext, '')) + '.' + ext;
                }
                next(null, filepath);
            });
        }
    ], function(err, results) {
        return callback(err, results[2]);
    });
};

// Takes image filepath and returns callback with image url
PostHelpers.getImageUrl = function(filepath, next) {
    return next(filepath.split('public')[1].replace('//', '/'));
};

PostHelpers.getOrCreateCityRestaurantCategory = function(cityName, restaurantName, categoryName, next) {
    async.parallel([
        function(next) {
            async.waterfall([
                function(next) {
                    city.findOne({ name: cityName }, function(err, doc) {
                        if (!!!doc) {
                            var newCity = new city({name: cityName});
                            newCity.save(function(err, doc){
                                console.log('creating city', doc);
                                next(err, doc);
                            });
                        } else {
                            next(err, doc);
                        }
                    });
                },
                function(city, next) {
                    restaurant.findOne({ name: restaurantName, _city: city._id }, function(err, doc) {
                        if (!!!doc) {
                            var newRestaurant = new restaurant({ name: restaurantName, _city: city._id });
                            newRestaurant.save(function(err, doc) {
                                console.log('new rest', doc);
                                next(err, { city: city, restaurant: doc });
                            });
                        } else {
                            next(err, { city: city, restaurant: doc });
                        }
                    });
                }
            ], function(err, results) {
                next(err, [results.city, results.restaurant]);
            });
        },
        function(next) {
            category.findOne({ name: categoryName }, function(err, doc) {
                if (!!!doc) {
                    var newCategory = new category({ name: categoryName });
                    newCategory.save(function(err, doc) {
                        next(err, doc);
                    });
                } else {
                    next(err, doc);
                }
            });
        }
    ], function(err, results) {
        next(err, { city: results[0][0], restaurant: results[0][1], category: results[1] });
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
