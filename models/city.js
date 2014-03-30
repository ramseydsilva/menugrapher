var mongoose = require('mongoose'),
    supergoose = require('supergoose');

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

citySchema.plugin(supergoose, {instance: mongoose});
module.exports = mongoose.model("city", citySchema);
