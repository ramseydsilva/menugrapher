var mongoose = require('mongoose'),
    fs = require('fs'),
    async = require('async'),
    city = require('./city'),
    category = require('./category'),
    restaurant = require('./restaurant');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var postSchema = new mongoose.Schema({
    pic: {
        originalPath: String,
        originalUrl: String,
        thumbPath: String,
        thumbUrl: String
    },
    user: {
        uid: String,
        name: String
    },
    title: String,
    description: String,
    _user: { type: mongoose.Schema.ObjectId, ref : 'User' },
    _city: { type: mongoose.Schema.ObjectId, ref : 'city' },
    _restaurant: { type: mongoose.Schema.ObjectId, ref : 'restaurant' },
    _category: { type: mongoose.Schema.ObjectId, ref : 'category' },
    _item: { type: mongoose.Schema.ObjectId, ref : 'item' },
    updatedAt: { type: Date }
}, schemaOptions);

postSchema.virtual('url').get(function() {
    return "/posts/" + this._id;
});

postSchema.virtual('editUrl').get(function() {
    return this.url + '/edit';
});

postSchema.virtual('deleteUrl').get(function() {
    return this.url + '/delete';
});

postSchema.virtual('createdAt').get(function() {
    return this._id.getTimestamp();
});

postSchema.virtual('userUrl').get(function() {
    return '/users/' + this.user.uid;
});

postSchema.method({
    userHasRights: function(user) {
        return !!user && this.user.uid == user.id;
    }
});

postSchema.pre('save', function(next) {
    var self = this;
    self.updatedAt = new Date();
    next();
});

postSchema.post('remove', function(doc) {
    console.log('removing doc', doc.pic.originalPath)
    fs.unlink(doc.pic.originalPath);
});

module.exports = mongoose.model('post', postSchema);
