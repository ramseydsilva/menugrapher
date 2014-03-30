var mongoose = require('mongoose'),
    supergoose = require('supergoose'),
    city = require('./city');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var restaurantSchema = new mongoose.Schema({
    name: String,
    _city: { type: mongoose.Schema.ObjectId, ref: 'city' }
}, schemaOptions);

restaurantSchema.virtual('url').get(function() {
    return "/restaurants/" + this._id;
});

restaurantSchema.plugin(supergoose, {instance: mongoose});

city.schema.plugin(supergoose, {instance: mongoose});
city.schema.parentOf('restaurant', 'restaurants').enforceWith('_city');

module.exports = mongoose.model("restaurant", restaurantSchema);
