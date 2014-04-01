'use strict';

var mongoose = require('mongoose');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var itemSchema = new mongoose.Schema({
    name: String
}, schemaOptions);

module.exports = mongoose.model("item", itemSchema);
