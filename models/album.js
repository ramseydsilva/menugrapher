var mongoose = require('mongoose'),
    fs = require('fs'),
    async = require('async'),
    city = require('./city'),
    category = require('./category'),
    post = require('./post'),
    User = require('./User'),
    restaurant = require('./restaurant');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    autoIndex: true
};

var albumSchema = new mongoose.Schema({
    name: String,
    description: String,
    _user: { type: mongoose.Schema.ObjectId, ref : 'User' },
    _city: { type: mongoose.Schema.ObjectId, ref : 'city' },
    _restaurant: { type: mongoose.Schema.ObjectId, ref : 'restaurant' },
    _category: { type: mongoose.Schema.ObjectId, ref : 'category' },
    pics: [
        {type: mongoose.Schema.ObjectId, ref: 'post'}
    ],
    updatedAt: { type: Date },
    _meta: {
        socketId: String
    }
}, schemaOptions);

albumSchema.virtual('url').get(function() {
    return "/albums/" + this._id;
});

albumSchema.virtual('editUrl').get(function() {
    return this.url + '/edit';
});

albumSchema.virtual('addUrl').get(function() {
    return this.url + '/add';
});

albumSchema.virtual('deleteUrl').get(function() {
    return this.url + '/delete';
});

albumSchema.virtual('createdAt').get(function() {
    return this._id.getTimestamp();
});

albumSchema.virtual('userUrl').get(function() {
    return '/users/' + this._user;
});

albumSchema.method({
    userHasRights: function(user) {
        if (!!user & !!this._user) {
            return String(this._user._id || this._user) == String(user.id);
        }
        return false;
    }
});

albumSchema.pre('save', function(next) {
    var self = this;
    self.updatedAt = new Date();
    next();
});

albumSchema.index( { 'pics._id': 1 }, { unique: true, sparse: true } );
module.exports = mongoose.model('album', albumSchema);
