'use strict';

var mongoose = require('mongoose'),
    _ = require('underscore'),
    item = require('./item'),
    user = require('./User'),
    city = require('./city');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    autoIndex: true
};

var restaurantSchema = new mongoose.Schema({
    name: String,
    _city: { type: mongoose.Schema.ObjectId, ref : 'city' },
    menu: [
        {type: mongoose.Schema.ObjectId, ref: 'item', unique: true}
    ]
}, schemaOptions);

restaurantSchema.virtual('url').get(function() {
    return "/restaurants/" + this._id;
});

restaurantSchema.virtual('nonEmptyMenu').get(function() {
    return _.filter(this.menu, function(item) { return !!item.name && item.name != ''; });
});

restaurantSchema.index( { 'menu._id': 1 } );
var restaurantModel = mongoose.model("restaurant", restaurantSchema);

mongoose.set('debug', true);
mongoose.connection.on('error', function(err) {
    console.error('MongoDB error: %s', err);
});

module.exports = restaurantModel;
