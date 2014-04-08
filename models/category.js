var mongoose = require('mongoose');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var categorySchema = new mongoose.Schema({
    name: String,
    hits: { type: Number, default: 1, index: true}
}, schemaOptions);

categorySchema.virtual('url').get(function() {
    return "/categories/" + this._id;
});

module.exports = mongoose.model("category", categorySchema);
