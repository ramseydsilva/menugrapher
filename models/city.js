var mongoose = require('mongoose'),
    restaurant = require('./restaurant');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var citySchema = new mongoose.Schema({
    name: String
}, schemaOptions);

citySchema.virtual('url').get(function() {
    return "/cities/" + this._id;
});

citySchema.virtual('restaurantsUrl').get(function() {
    return this.url + '/restaurants';
});

module.exports = mongoose.model("city", citySchema);
