'use strict';

var mongoose = require('mongoose'),
    _ = require('underscore'),
    async = require('async'),
    item = require('./item'),
    slug = require('slug'),
    linker = require('socialfinder'),
    ItemKeywords = require('./itemkeywords'),
    ItemKeywordsBlacklisted = require('./itemkeywordsblacklisted'),
    user = require('./User'),
    city = require('./city'),
    oprop = require('oprop');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    autoIndex: true
};

var restaurantSchema = new mongoose.Schema({
    name: String,
    slug: { type: String, index: true },
    url: { type: String },
    _city: { type: mongoose.Schema.ObjectId, ref : 'city' },
    city: {},
    _category: { type: mongoose.Schema.ObjectId, ref : 'category' },
    menu: [{type: mongoose.Schema.ObjectId, ref: 'item', unique: true}],
    image: {url: String, path: String},
    website: String,
    infos: [{}],
    crawledLinks: {},
    dateCrawledWebsite: Date,
    description: String,
    hours: String,
    links: [{}],
    contact: {
        phone: String,
        email: String
    },
    location: {
        longitude: String,
        latitude: String,
        address: String
    },
    reviews: {
        price: String,
        rating: String,
        user_reviews: [{}]
    },
    photos: [{}],
    hits: { type: Number, default: 1, index: true },
    fetch: {}
}, schemaOptions);

restaurantSchema.virtual('refetch').get(function() {
    return !this.fetch || (!!this.fetch ? !this.fetch.googlePlacesDetail : true);
});

restaurantSchema.virtual('nonEmptyMenu').get(function() {
    return _.filter(this.menu, function(item) {
        return !!item.name && item.name != '';
    });
});

restaurantSchema.method({
    populateData: function(source, force, callback) {
        if (!callback) {
            callback = force;
            force = false;
        }
        if (source == 'fetch.googleMaps' && !!this.fetch && !!this.fetch.googleMaps && !!this.fetch.googleMaps.res
            && (!this.fetch.googleMaps.populated || force)) {
            this.location = this.fetch.googleMaps.res;
            this.fetch.googleMaps.populated = true;
            this.markModified('fetch');
            this.save(callback);
        } else if (source == 'fetch.googlePlacesDetail' && !!this.fetch && !!this.fetch.googlePlacesDetail 
            && !!this.fetch.googlePlacesDetail.res && (!this.fetch.googlePlacesDetail.populated || force)) {
            var base = this.fetch.googlePlacesDetail.res;
            this.location.latitude = base.geometry.location.lat || base.geometry.location.k;
            this.location.longitude = base.geometry.location.lng || base.geometry.location.A;
            this.location.address = base.formatted_address;
            this.contact.phone = base.formatted_phone_number;
            this.reviews.rating = base.rating;
            this.reviews.price = base.price_level;
            this.reviews.user_reviews = base.reviews;
            this.photos = base.photos;
            this.website = base.website;
            this.links.push({source: 'google', href: base.url});
            this.fetch.googlePlacesDetail.populated = true;
            this.markModified('fetch');
            this.save(callback);
        } else if (source == 'fetch.googlePlacesSearch' && !!this.fetch && !!this.fetch.googlePlacesSearch 
            && !!this.fetch.googlePlacesSearch.res && (!this.fetch.googlePlacesSearch.populated || force)) {
            var base = this.fetch.googlePlacesSearch.res;
            this.location.latitude = base.geometry.location.lat || base.geometry.location.k;
            this.location.longitude = base.geometry.location.lng || base.geometry.location.A;
            this.fetch.googlePlacesSearch.populated = true;
            this.markModified('fetch');
            this.save(callback);
        } else {
            callback(null, this);
        }
    },
    saveCity: function(next) {
        var that = this;
        mongoose.model("city").findOne({_id: (this._city._id || this._city)}, function(err, city) {
            if (!!err) throw err;
            that.city = city.toJSON();
            if (!!next) next();
        });
    },
    makeSlug: function(iterator, force, next) {
        var that = this;
        if (force || (!!this.name && !this.slug)) {
            var _slug = slug(this.name.toLowerCase() + (!!iterator ? '-'+iterator: ''));
            mongoose.model("restaurant").findOne({_city: (this._city.id || this._city), slug: _slug}, function(err, exists) {
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
    },
    makeUrl: function(next) {
        if (!!this.slug && !!this.getProperty('city.slug')) {
            this.url = '/'+this.city.slug+'/'+this.slug;
        } else if (!!this.slug) {
            this.url = "/restaurants/" + this.slug;
        } else {
            this.url = "/restaurants/" + this._id;
        }
        if (!!next) next();
    },
    addMenuItem: function(item, next) {
        var that = this;
        mongoose.model('item').findOneAndUpdate({ name: item.name, info: item, _restaurant: this._id }, {}, {upsert: true}, function(err, doc) {
            if (err) throw err;
            mongoose.model('restaurant').update({_id: that._id}, { $addToSet: {menu: doc._id }}, function(err, _) {
                if (err) throw err;
                if (next) next(err, doc);
            });
        });
    },
    crawl: function(next) {
        var doc = this;
        var l = new linker();
        async.parallel({
            getItemKeywords: function(next) {
                ItemKeywords.find({}).exec(function(err, items) {
                    var menuKeywords = _.map(items, function(item) {
                        return item.name;
                    });
                    next(null, _.union(menuKeywords, l.defaults.menuKeywords));
                });
            },
            getItemKeywordsBlacklisted: function(next) {
                ItemKeywordsBlacklisted.find({}).exec(function(err, items) {
                    var menuKeywordsBlacklisted = _.map(items, function(item) {
                        return item.name;
                    });
                    next(null, _.union(menuKeywordsBlacklisted, l.defaults.menuKeywordsBlacklisted));
                });
            }
        }, function(err, results) {
            if (!!doc.website) {

                if (doc.links.length > 4) {
                    l.defaults.getLinks = false;
                } else {
                    l.defaults.getLinks = true;
                }

                if (doc.menu.length > 10) {
                    l.defaults.getMenu = false;
                } else {
                    l.defaults.getMenu = true;
                }

                // get info only if less than 2 paragraphs of info are present
                if (doc.infos.length > 3) {
                    l.defaults.getInfo = false;
                } else {
                    l.defaults.getInfo = true;
                }

                if (!(l.defaults.getInfo || l.defaults.getMenu || l.defaults.getLinks)) {
                    if (next) next();
                    return;
                }

                l.defaults.crawledLinks = _.map(_.keys(doc.crawledLinks), function(url) { return url.replace(/dotdot/g, '.') });
                //l.defaults.infoWords = [doc.name.toLowerCase()];
                l.defaults.menuKeywords = results.getItemKeywords;
                l.defaults.menuKeywordsBlacklisted = results.getItemKeywordsBlacklisted;

                l.crawl(doc.website)
                .progressed(function(data) {
                    console.log('Progressed: ', data);
                    if (!!data.url) {
                        var url = data.url.replace(/\./g, 'dotdot');
                        if (!doc.crawledLinks) doc.crawledLinks = {};
                        doc.crawledLinks[url] = Date.now();
                    } else if (!!data.item) {
                        doc.addMenuItem(data.item, function(err, doc) {
                            console.log('Menu item added: ', doc.name);
                        });
                    } else if (!!data.info) {
                        doc.update({$addToSet: {infos: data.info}}, function() {});
                    } else {
                        doc.update({$addToSet: {links: data}}, function(err, _) { });
                    }
                })
                .finally(function(err, res) {
                    console.log('finished crawl');
                    doc.dateCrawledWebsite = Date.now();
                    if (next) doc.save(next); else doc.save();
                });
            } else {
                if (next) next(new Error("No website url"), doc);
            }
        });
    }
});

restaurantSchema.pre('save', function(next) {
    var that = this;
    async.series([
        function(next) {
            that.saveCity(next);
        },
        function(next) {
            that.makeSlug(0, false, next);
        },
        function(next) {
            that.makeUrl(next);
        }
    ], function(err, results) {
        if (err) console.log(err);
        next();
    });
});

restaurantSchema.index( { 'menu._id': 1 } );
var restaurantModel = mongoose.model("restaurant", restaurantSchema);

mongoose.set('debug', true);
mongoose.connection.on('error', function(err) {
    console.error('MongoDB error: %s', err);
});

module.exports = restaurantModel;
