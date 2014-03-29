var post = require('../models/post'),
    async = require('async');

exports.index = function(req, res) {
    res.render('home', {
        title: 'Home'
    });
};

exports.user = function(req, res) {
    async.parallel([
        function(cb) {
            post.find({'user.uid': req.params.user }).sort('-_id').exec(function(err, posts) {
                userPosts = posts;
                cb();
            });
        },
    ], function(results) {
        res.render('home/user', {
            posts: userPosts,
            user: res.locals.user
        });
    });

};

exports.dashboard = function(req, res) {
    var myPosts, recentPosts;

    async.parallel([
        function(cb) {
            post.find({ 'user.uid': req.user.id }).sort('-_id').exec(function(err, posts){
                myPosts = posts;
                cb();
            });
        },
        function(cb) {
            recentPosts = post.find({ 'user.uid': {'$ne': req.user.id }}).sort('-_id').exec(function(err, posts){
                recentPosts = posts;
                cb();
            });
        }
    ], function(results) {
        res.render('home/dashboard', {
            title: 'Dashboard',
            myPosts: myPosts,
            recentPosts: recentPosts
        });
    });
}
