var mongoose = require('mongoose'),
    slug = require('slug'),
    async = require('async'),
    restaurant = require('./restaurant');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var citySchema = new mongoose.Schema({
    name: String,
    slug: { type: String, index: true },
    url: { type: String },
    hits: { type: Number, default: 1, index: true },
    location: {
        longitude: String,
        latitude: String
    }
}, schemaOptions);

citySchema.virtual('restaurantsUrl').get(function() {
    return this.url + '/restaurants';
});

citySchema.method({
    makeSlug: function(iterator, force, next) {
        if (!force && !next) {
            next = iterator;
            iterator = 0;
            force = false;
        }
        var that = this;
        if (force || (!!this.name && !this.slug)) {
            var _slug = slug(this.name.toLowerCase() + (!!iterator ? '-'+iterator: ''));
            mongoose.model("city").findOne({slug: _slug}, function(err, exists) {
                if (!!exists) {
                    that.makeSlug(iterator+1, force, next);
                } else {
                    that.slug = _slug;
                    console.log('making slug', that.slug);
                    if (!!next) next();
                }
            });
        } else {
            if (!!next) next();
        }
    },
    makeUrl: function(next) {
        if (!!this.slug) {
            this.url = "/cities/" + this.slug;
        } else {
            this.url = "/cities/" + this._id;
        }
        if (!!next) next();
    }
});

citySchema.pre('save', function(next) {
    var that = this;
    async.series([
        function(next) {
            that.makeSlug(0, false, next);
        },
        function(next) {
            that.makeUrl(next);
        }
    ], function(err, results) {
        next();
    });
});

citySchema.post('save', function() {
    var fetch = require('../fetch/city');
    fetch.getLatLng(this);
});

module.exports = mongoose.model("city", citySchema);
