'use strict';

var mongoose = require('mongoose');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var itemKeywordsSchema = new mongoose.Schema({
    name: String,
    _restaurant: { type: mongoose.Schema.ObjectId, ref : 'restaurant' },
}, schemaOptions);

module.exports = mongoose.model("itemkeywords", itemKeywordsSchema);
