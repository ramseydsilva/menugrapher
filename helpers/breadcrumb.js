'use strict';

module.exports.home = function(_class) {
    return { text: 'Home', url: '/', class: !!_class ? _class : ''};
};

module.exports.posts = function(_class) {
    return { text: 'Posts', url: '/posts/', class: !!_class ? _class : ''};
};

module.exports.cities = function(_class) {
    return { text: 'Cities', url: '/cities', class: !!_class ? _class : ''};
};

module.exports.restaurants = function(_class) {
    return { text: 'Restaurants', url: '/restaurants', class: !!_class ? _class : ''};
};

module.exports.categories = function(_class) {
    return { text: 'Categories', url: '/categories', class: !!_class ? _class : ''};
};

module.exports.users = function(_class) {
    return { text: 'Users', url: '/users/', class: ''};
};

module.exports.user = function(user, _class) {
    return { text: user.profile.name, url: '/user/' + user.id, class: 'active'};
};

module.exports.cityRestaurants = function(city, _class) {
    return { text: 'Restaurants', url: city.restaurantsUrl, class: !!_class ? _class : ''};
};

module.exports.city = function(city, _class) {
    if (!!city && !!city.name) {
        return { text: city.name, url: city.url, class: !!_class ? _class : ''};
    }
    return null;
};

module.exports.restaurant = function(restaurant, _class) {
    if (!!restaurant && !!restaurant.name) {
        return { text: restaurant.name, url: restaurant.url, class: !!_class ? _class : ''};
    }
    return null;
};


module.exports.item = function(item, _class) {
    return { text: item.name, url: item.url, class: !!_class ? _class : ''};
};

module.exports.category = function(category, _class) {
    return { text: category.name, url: category.url, class: !!_class ? _class : ''};
};

module.exports.post = function(post, _class) {
    return { text: !!post.title ? post.title : 'Post', url: post.url, class: !!_class ? _class : ''};
};

module.exports.newPost = function(_class) {
    return { text: 'New', url: '/post/new', class: !!_class ? _class : ''};
};

module.exports.albums = function(_class) {
    return { text: 'Albums', url: '', class: !!_class ? _class: ''};
};

module.exports.album = function(album, _class) {
    return { text: album.name, url: album.url, class: !!_class ? _class: ''};
};
