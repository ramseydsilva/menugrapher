'use strict';

var mongoose = require('mongoose');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var itemKeywordsSchema = new mongoose.Schema({
    name: String
}, schemaOptions);

module.exports = mongoose.model("itemkeywordsblacklisted", itemKeywordsSchema);
