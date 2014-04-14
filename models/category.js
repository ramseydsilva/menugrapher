var mongoose = require('mongoose'),
    slug = require('slug'),
    async = require('async');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var categorySchema = new mongoose.Schema({
    name: String,
    slug: { type: String, index: true, unique: true },
    url: { type: String, unique: true },
    hits: { type: Number, default: 1, index: true}
}, schemaOptions);

categorySchema.method({
    makeSlug: function(iterator, force, next) {
        if (!force && !next) {
            next = iterator;
            iterator = 0;
            force = false;
        }
        var that = this;
        if (force || (!!this.name && !this.slug)) {
            var _slug = slug(this.name.toLowerCase() + (!!iterator ? '-'+iterator: ''));
            mongoose.model("category").findOne({slug: _slug}, function(err, exists) {
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
            this.url = "/categories/" + this.slug;
        } else {
            this.url = "/categories/" + this._id;
        }
        if (!!next) next();
    }
});

categorySchema.pre('save', function(next) {
    var that = this;
    async.series([
        function(next) {
            that.makeSlug(0, false, next);
        },
        function(next) {
            that.makeUrl(next);
        }
    ], function(err, results) {
        console.log(err, 'in save', that);
        next();
    });
});

module.exports = mongoose.model("category", categorySchema);
