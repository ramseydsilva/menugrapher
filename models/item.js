'use strict';

var mongoose = require('mongoose');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var itemSchema = new mongoose.Schema({
    name: String,
    _restaurant: { type: mongoose.Schema.ObjectId, ref : 'restaurant' },
}, schemaOptions);

itemSchema.virtual('url').get(function() {
    return "/items/" + this._id;
});

module.exports = mongoose.model("item", itemSchema);
