'use strict';

var item = require('../models/item'),
    middleware = {};

middleware.itemExists = function(req, res, next) {
    item.findOne({_id: req.param('item')}).populate('_restaurant').exec(function(err, item) {
        var restaurant = item._restaurant;
        restaurant.populate('_city', function(err, _restaurant) {
            item._restaurant = _restaurant;

            if (item) {
                res.locals.item = item;
                next();
            } else {
                res.status(404);
                res.render('404');
            }
        });
    });
}

module.exports = middleware;
