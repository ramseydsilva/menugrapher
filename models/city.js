var mongoose = require('mongoose'),
    restaurant = require('./restaurant');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var citySchema = new mongoose.Schema({
    name: String,
    hits: { type: Number, default: 1, index: true },
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

citySchema.post('save', function() {
    var fetch = require('../fetch/city');
    fetch.getLatLng(this);
});

module.exports = mongoose.model("city", citySchema);
