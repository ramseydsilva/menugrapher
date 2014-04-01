var mongoose = require('mongoose'),
    restaurant = require('./restaurant');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var citySchema = new mongoose.Schema({
    name: String,
    restaurants: [restaurant.schema]
}, schemaOptions);

citySchema.virtual('url').get(function() {
    return "/cities/" + this._id;
});

module.exports = mongoose.model("city", citySchema);
