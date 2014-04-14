var mongoose = require('mongoose'),
    slug = require('slug'),
    restaurant = require('./restaurant');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var citySchema = new mongoose.Schema({
    name: String,
    slug: { type: String, index: true },
    hits: { type: Number, default: 1, index: true },
    location: {
        longitude: String,
        latitude: String
    }
}, schemaOptions);

citySchema.virtual('url').get(function() {
    if (!!this.slug)
        return "/cities/" + this.slug;
    return "/cities/" + this._id;
});

citySchema.virtual('restaurantsUrl').get(function() {
    return this.url + '/restaurants';
});

citySchema.method({
    makeSlug: function(iterator, force, next) {
        var that = this;
        if (force || (!!this.name && !this.slug)) {
            var _slug = slug(this.name.toLowerCase() + (!!iterator ? '-'+iterator: ''));
            mongoose.model("city").findOne({slug: _slug}, function(err, exists) {
                if (!!exists) {
                    that.makeSlug(iterator+1, force, next);
                } else {
                    that.slug = _slug;
                    if (!!next) next();
                }
            });
        } else {
            if (!!next) next();
        }
    }
});

citySchema.pre('save', function(next) {
    this.makeSlug(0, false, next);
});

citySchema.post('save', function() {
    var fetch = require('../fetch/city');
    fetch.getLatLng(this);
});

module.exports = mongoose.model("city", citySchema);
