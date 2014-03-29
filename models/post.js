var mongoose = require('mongoose');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var restaurantSchema = new mongoose.Schema({
    name: String
}, schemaOptions);
var restaurant = mongoose.model("restaurant", restaurantSchema);

var itemSchema = new mongoose.Schema({
    name: String,
    restaurant: { type: mongoose.Schema.ObjectId, ref : 'restaurant' }
}, schemaOptions);
var item = mongoose.model("item", itemSchema);

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
    item: { type: mongoose.Schema.ObjectId, ref : 'item' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date }
}, schemaOptions);

postSchema.virtual('url').get(function() {
    return "/post/" + this._id + '/';
});

postSchema.virtual('editUrl').get(function() {
    return this.url + 'edit';
});

postSchema.virtual('deleteUrl').get(function() {
    return this.url + 'delete';
});

postSchema.method({
    userHasRights: function(user) {
        return user && this.user.uid == user.id;
    }
});

postSchema.pre('save', function(next) {
    this.updatedAt = new Date;
    next();
});

var post = mongoose.model('post', postSchema);

module.exports = post;
