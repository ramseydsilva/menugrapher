var post = require('../models/post'),
    async = require('async');

exports.index = function(req, res) {
    res.render('home', {
        title: 'Home'
    });
};

exports.user = function(req, res) {
    var breadcrumbs = [
        { text: 'Dashboard', url: '/dashboard', class: ''},
        { text: 'Users', url: '/users/', class: ''},
        { text: res.locals.user.profile.name, url: '/user/' + req.params.user, class: 'active'}
    ];

    async.parallel([
        function(cb) {
            post.find({'user.uid': req.params.user }).sort('-_id').exec(function(err, posts) {
                userPosts = posts;
                cb();
            });
        },
    ], function(results) {
        res.render('home/user', {
            breadcrumbs: breadcrumbs,
            posts: userPosts,
            user: res.locals.user
        });
    });

};

exports.dashboard = function(req, res) {
    var myPosts, recentPosts;
    var breadcrumbs = [{ text: 'Dashboard', url: '/dashboard', class: 'active'}];

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
            breadcrumbs: breadcrumbs,
            myPosts: myPosts,
            recentPosts: recentPosts
        });
    });
}
