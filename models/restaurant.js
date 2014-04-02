'use strict';

var mongoose = require('mongoose'),
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
    menu: [item.schema]
}, schemaOptions);

restaurantSchema.virtual('url').get(function() {
    return "/restaurants/" + this._id;
});

restaurantSchema.index( { 'menu._id': 1 }, { unique: true } );
var restaurantModel = mongoose.model("restaurant", restaurantSchema);

mongoose.set('debug', true);
mongoose.connection.on('error', function(err) {
    console.error('MongoDB error: %s', err);
});

module.exports = restaurantModel;
