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
    city: {
        _id: String,
        name: String
    },
    restaurant: {
        _id: String,
        name: String
    },
    category: {
        _id: String,
        name: String
    },
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
    async.parallel({
        city: function(next) {
            if(self.city._id != self._city) {
                city.findOne({_id: self._city}, function(err, doc) {
                    self.city._id = doc._id;
                    self.city.name = doc.name;
                    next(err, doc);
                });
            } else {
                next();
            }
        },
        restaurant: function(next) {
            if (self.restaurant._id != self._restaurant) {
                restaurant.findOne({_id: self._restaurant}, function(err, doc) {
                    self.restaurant._id = doc._id
                    self.restaurant.name = doc.name;
                    next(err, doc);
                });
            } else {
                next();
            }
        },
        category: function(next) {
            if (self.category._id != self._category) {
                category.findOne({_id: self._category}, function(err, doc) {
                    self.category._id = doc._id;
                    self.category.name = doc.name;
                    next(err, doc);
                });
            } else {
                next();
            }
        }
    }, function(err, results) {
        if (err) throw err;
        next();
    });
});

postSchema.post('remove', function(doc) {
    console.log('removing doc', doc.pic.originalPath)
    fs.unlink(doc.pic.originalPath);
});

module.exports = mongoose.model('post', postSchema);
