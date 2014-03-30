var mongoose = require('mongoose'),
    supergoose = require('supergoose');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var categorySchema = new mongoose.Schema({
    name: String
}, schemaOptions);


categorySchema.virtual('url').get(function() {
    return "/categories/" + this._id;
});

categorySchema.plugin(supergoose, {instance: mongoose});
module.exports = mongoose.model("category", categorySchema);
