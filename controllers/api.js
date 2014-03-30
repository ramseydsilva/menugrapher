'use strict';

exports.cities = function(req, res) {
    var breadcrumbs = [
        { text: 'Dashboard', url: '/dashboard', class: ''},
        { text: 'Posts', url: '/posts/', class: 'active'},
    ];

    res.render('post/posts', {
        title: "Posts",
        breadcrumbs: breadcrumbs,
        posts: posts
    });
};
