'use strict';

var album = require('../models/album'),
    middleware = {};

middleware.albumExists = function(req, res, next) {
    album.findOne({_id: req.param('album')}).populate('_user').populate('pics').exec(function(err, album) {
        if (album) {
            res.locals.album = album;
            next();
        } else {
            res.status(404);
            res.render('404');
        }
    });
}

module.exports = middleware;
