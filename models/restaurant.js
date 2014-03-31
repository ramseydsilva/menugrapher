var mongoose = require('mongoose'),
    city = require('./city');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var restaurantSchema = new mongoose.Schema({
    name: String,
    _city: { type: mongoose.Schema.ObjectId, ref: 'city' },
}, schemaOptions);

restaurantSchema.virtual('url').get(function() {
    return "/restaurants/" + this._id;
});

restaurantSchema.post('save', function(err, restaurant) {
});

module.exports = mongoose.model("restaurant", restaurantSchema);
