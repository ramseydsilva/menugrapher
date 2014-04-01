'use strict';

var item = require('../models/item'),
    middleware = {};

middleware.itemExists = function(req, res, next) {
    item.findOne({_id: req.param('item')}).populate('_city').exec(function(err, item) {
        if (item) {
            res.locals.item = item;
            next();
        } else {
            res.status(404);
            res.render('404');
        }
    });
}

module.exports = middleware;
