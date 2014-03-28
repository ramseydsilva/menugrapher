var post = require('../models/post');

exports.index = function(req, res) {
    res.render('home', {
        title: 'Home'
    });
};

exports.dashboard = function(req, res) {
    post.find().sort('-createdAt').exec(function(err, posts) {
        res.render('home/dashboard', {
            title: 'Dashboard',
            posts: posts
        });
    });
}
