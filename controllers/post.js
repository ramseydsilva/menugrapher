var fs = require('fs'),
    post = require('../models/post');

exports.viewPost = function(req, res) {
    post.findOne({_id: req.param('post')}, function(err, post) {
        if (post) {
            res.render('post/view', {
                title: "Post",
                post: post
            });
        } else {
            res.status(404);
            res.render('404');
        }
    });
};

exports.newPost = function(req, res) {
    console.log(req);
    console.log(req.files);
    if (!!!req.files.image) {
        console.log("There was an error")
        res.redirect("/");
        res.end();
    } else {
        fs.readFile(req.files.image.path, function (err, data) {
            /// If there's an error
            var imageName = req.files.image.name
            var path = require('path');
            var originalPath = path.dirname(require.main.filename) + "/public/uploads/original/" + imageName;
            var originalUrl = "/uploads/original/" + imageName;

            /// write file to uploads/original folder
            fs.writeFile(originalPath, data, function (err) {
                postData = {
                    user: {
                        uid: req.user.id,
                        name: req.user.profile.name
                    },
                    description: "Test desc",
                    pic: {
                        originalPath: originalPath,
                        originalUrl: originalUrl,
                        thumbPath: "",
                        thumbUrl: "",
                    }
                };
                var newPost = new post(postData);
                newPost.save(function(err, newPost, numberAffected) {
                    console.log(newPost);
                    res.redirect(originalUrl);
                });
            });
        });
    }
};
