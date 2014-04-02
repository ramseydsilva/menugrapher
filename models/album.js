var mongoose = require('mongoose'),
    fs = require('fs'),
    async = require('async'),
    city = require('./city'),
    category = require('./category'),
    post = require('./post'),
    restaurant = require('./restaurant');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var albumSchema = new mongoose.Schema({
    title: String,
    description: String,
    _user: { type: mongoose.Schema.ObjectId, ref : 'User' },
    _city: { type: mongoose.Schema.ObjectId, ref : 'city' },
    _restaurant: { type: mongoose.Schema.ObjectId, ref : 'restaurant' },
    _category: { type: mongoose.Schema.ObjectId, ref : 'category' },
    pics: [post.schema],
    updatedAt: { type: Date }
}, schemaOptions);

albumSchema.virtual('url').get(function() {
    return this.userUrl + "/albumt/" + this._id;
});

albumSchema.virtual('createdAt').get(function() {
    return this._id.getTimestamp();
});

albumSchema.virtual('userUrl').get(function() {
    return '/users/' + this.user.uid;
});

albumSchema.method({
    userHasRights: function(user) {
        return !!user && this.user.uid == user.id;
    }
});

albumSchema.pre('save', function(next) {
    var self = this;
    self.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('album', albumSchema);