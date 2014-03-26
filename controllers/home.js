var post = require('../models/post');

exports.index = function(req, res) {
    if (req.user) {
        post.find(function(err, posts) {
            res.render('user_home', {
                title: 'Home',
                posts: posts
            });
        });
    } else {
        res.render('home', {
        title: 'Home'
        });
    }
};
