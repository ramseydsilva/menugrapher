'use strict';

var mongoose = require('mongoose'),
    _ = require('underscore'),
    item = require('./item'),
    slug = require('slug'),
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
    _city: { type: mongoose.Schema.ObjectId, ref : 'city' },
    city: {},
    _category: { type: mongoose.Schema.ObjectId, ref : 'category' },
    menu: [{type: mongoose.Schema.ObjectId, ref: 'item', unique: true}],
    image: {url: String, path: String},
    website: String,
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

restaurantSchema.virtual('url').get(function() {
    if (!!this.getProperty('city.slug') && !!this.slug)
        return '/'+this.city.slug+'/'+this.slug;
    if (!!this.slug)
        return "/restaurants/" + this.slug;
    return "/restaurants/" + this._id;
});

restaurantSchema.virtual('refetch').get(function() {
    return !this.fetch || (!!this.fetch ? !this.fetch.googlePlacesDetail : true);
});

restaurantSchema.virtual('nonEmptyMenu').get(function() {
    return _.filter(this.menu, function(item) { return !!item.name && item.name != ''; });
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
            this.links.google = base.url;
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
    }
});

restaurantSchema.pre('save', function(next) {
    if (!!this._city.name) {
        console.log('city save', this._city);
        this.city = this._city.toJSON();
    }
    this.makeSlug(0, false, next);
});

restaurantSchema.index( { 'menu._id': 1 } );
var restaurantModel = mongoose.model("restaurant", restaurantSchema);

mongoose.set('debug', true);
mongoose.connection.on('error', function(err) {
    console.error('MongoDB error: %s', err);
});

module.exports = restaurantModel;
