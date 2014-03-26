var mongoose = require('mongoose'),
    db = require('../database'),
    emitter = require('../emitter'),
    async = require('async');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var restaurantSchema = new mongoose.Schema({
    name: String
}, schemaOptions);
var restaurant = mongoose.model('restaurant', restaurantSchema);

var itemSchema = new mongoose.Schema({
    name: String,
    restaurant: { type: mongoose.Schema.ObjectId, ref : 'restaurant' }
}, schemaOptions);
var item = mongoose.model('item', itemSchema);

var postSchema = new mongoose.Schema({
    pic: {
        originalPath: String,
        originalUrl: String,
        thumbPath: String,
        thumbUrl: String,
    },
    user: {
        uid: String,
        name: String
    },
    description: String,
    item: { type: mongoose.Schema.ObjectId, ref : 'item' }
}, schemaOptions);

postSchema.virtual('url').get(function() {
    return "/post/" + this._id;
}); 

var post = mongoose.model('post', postSchema);
module.exports = post;
