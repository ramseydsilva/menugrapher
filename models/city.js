var mongoose = require('mongoose'),
    fetch = require('../fetch/city'),
    restaurant = require('./restaurant');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var citySchema = new mongoose.Schema({
    name: String,
    location: {
        longitude: String,
        latitude: String
    }
}, schemaOptions);

citySchema.virtual('url').get(function() {
    return "/cities/" + this._id;
});

citySchema.virtual('restaurantsUrl').get(function() {
    return this.url + '/restaurants';
});

citySchema.pre('save', function(next) {
    fetch.getLatLng(this, function(err, doc) {
        next();
    });
});

module.exports = mongoose.model("city", citySchema);
