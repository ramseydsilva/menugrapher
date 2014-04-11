'use strict';

/**
 * @module restaurantFetch
 * @callback fetchCallback
 * @param {Error} error
 * @param {Restaurant} restaurant saved restaurant doc
 */

var geocoderProvider = 'google',
    _ = require('underscore'),
    async = require('async'),
    request = require('request'),
    httpAdapter = 'https',
    app = require('../app'),
    googleplaces = require('googleplacesapi'),
    gp = new googleplaces({key: app.secrets.google.serverKey}),
    postHelpers = require('../helpers/post'),
    extra = {
        apiKey: app.secrets.google.serverKey,
        formatter: null
    },
    geocoder = require('node-geocoder').getGeocoder(geocoderProvider, httpAdapter, extra),
    Restaurant = require('../models/restaurant'),
    xtend = require('xtend'),
    fs = require('fs'),
    jsdom = require('jsdom'),
    jquery = require('fs').readFileSync("node_modules/jquery/dist/jquery.min.js", "utf-8"),
    fetch = {};

/**
 * Saves the data to the restaurant
 * @method save
 * @param {Object} data should contain id, data
 * @param {String} source from where was this fetched
 * @param {fetchCallback} callback
 */
fetch.save = function(data, source, callback) {
    var opts = {}, createNew = false;
    opts['fetch.' + source] = {};
    if (data.res) opts['fetch.' + source].res = data.res;
    if (data.err) opts['fetch.' + source].err = data.err;
    opts['fetch.' + source].date = new Date();
    if (!!data.res || !!data.err) {
        if (source.indexOf('googlePlaces') != -1) {
            // For saves involving either google search or google detail search
            opts['fetch.googleReference'] = data.res.reference;
            if (!!data.id) {
                Restaurant.findById(data.id, function(err, doc) {
                    if (data.id && !!doc) {
                        Restaurant.findOneAndUpdate({_id: data.id}, opts, callback);
                    } else {
                        createNew = true;
                    }
                });
            } else if (!!data._city) {
                Restaurant.find({_name: data.name, _city: data._city}, function(err, docs) {
                    if (docs.length == 1) {
                        Restaurant.findOneAndUpdate({_id: data.id}, opts, callback);
                    } else {
                        createNew = true; // Too many restaurants returned, create new one instead
                    }
                });
            } else {
                createNew = true;
            }

            if (createNew) {
                postHelpers.getOrCreateCityRestaurantCategoryItem(data.city, data.name, '', '', function(err, results) {
                    Restaurant.findOneAndUpdate({_id: results.restaurant.id}, opts, callback);
                });
            }

        } else if (source.indexOf('googleMaps') != -1) {
            if (!!callback) Restaurant.findOneAndUpdate({_id: data.id}, opts, callback);
        } else {
            if (!!callback) callback(new Error('Unidentified source'), null);
        }
    } else {
        if (!!callback) callback(new Error('No data supplied'), null);
    }
};

/**
 * Server fetch information from google Map Api
 * Saves info to restaurant fetch as googleMaps object
 *
 * @method googleMaps
 * @param {Restaurant} restaurant Restaurant doc
 * @param {fetchCallback} callback
 */
fetch.googleMaps = function(restaurant, callback) {
    if (!restaurant.fetch || !restaurant.fetch.googleMaps) {
        var query = restaurant.name + ', ' + restaurant._city.name;
        geocoder.geocode(query, function(err, res) {
            if (!err) {
                fetch.save({
                    id: restaurant._id,
                    name: restaurant.name,
                    city: restaurant._city.name,
                    res: res[0]
                }, 'googleMaps', callback); 
            } else {
                callback(err, restaurant);
            }
        });
    } else {
        callback(null, restaurant);
    }
};

fetch.googlePlacesDetail = function(restaurant, force, callback) {
    if (!callback) {
        callback = force;
        force = false;
    }
    if (!!restaurant.fetch && restaurant.fetch.googleReference) {
        if (!restaurant.fetch.googlePlacesDetail || force) {
            gp.details({
                reference: restaurant.fetch.googleReference
            }, function(err, res) {
                if (!err) {
                    var result = res.result;
                    fetch.save({
                        id: restaurant._id,
                        name: result.name,
                        city: restaurant._city.name,
                        res: result 
                    }, 'googlePlacesDetail', callback); 
                } else {
                    callback(err, restaurant);
                }
            });
        } else {
            callback(null, restaurant); // Search already performed before
        }
    } else {
        callback(new Error("No google reference specified"), restaurant);
    }
};

/**
 * Server fetch information from google Places Api
 * Saves info to restaurant.fetch as googlePlacesServer object
 *
 * @method googlePlaces
 * @param {Restaurant} restaurant Restaurant doc
 * @param {fetchCallback} callback
 */
fetch.googlePlacesSearch = function(restaurant, force, callback) {
    if (!callback) {
        callback = force;
        force = false;
    }
    if (restaurant.location && restaurant._city && restaurant._city.name && restaurant.location.latitude && restaurant.location.longitude) {
        if (!restaurant.fetch.googlePlacesSearch || force) {
            gp.search({
                name: restaurant.name+', '+restaurant._city.name,
                location: restaurant.location.latitude+', '+restaurant.location.longitude
            }, function(err, res) {
                if (!err) {
                    results = res.results
                    async.each(results, function(res, next) {
                        fetch.save({
                            id: restaurant._id,
                            name: res.name,
                            city: restaurant._city.name,
                            res: res
                        }, 'googlePlacesSearch', next);
                    }, function(err, results) {
                        callback(null, restaurant);
                    });
                } else {
                    callback(err, restaurant);
                }
            });
        } else {
            callback(null, restaurant); // Places search already performed before
        }
    } else {
        callback(new Error("Need restaurant city name, latitude and longitude"), restaurant);
    }
}

fetch.crawlWebsite = function(website, mainCallback) {
    var maxDepth = 2;
    var allLinks = {};
    var defaults = {
        links: ['facebook', 'google', 'yelp', 'yellowpages', 'openrice', 'twitter', 'foursquare', 'linkedin', 'instagram'],
        blacklisted: ['twitterapi']
    };
    var linkCrawledIndex = [];
    var notAllowed = ['.pdf', '.jpeg', '.jpg', '.bmp', '.gif'];
    var requestsMade = 0, requestsSuccess = 0, requestsErrors = 0;
    var allowedDomains = [];
    var sameDomain = true;
    var results = [];
    var maxLinks = 50;

    this.getAbsoluteUrl = function(absoluteUrl, relativeUrl) {
        var protocol = 'http', domain = '', link = '';
        // get protocol
        if (relativeUrl.indexOf('://') != -1) { // Url is already absolute
            return relativeUrl;
        } else if (relativeUrl.indexOf('/') == 0) { // Url starts with /
            domain = absoluteUrl.split(/^(([^:\/?#]+):)?(\/\/([^\/?#]*))?()?/)[4];
            protocol = absoluteUrl.split(/^(([^:\/?#]+):)?(\/\/([^\/?#]*))?()?/)[2];
            return protocol+'://'+domain+relativeUrl;
        } else if (relativeUrl.indexOf('/') != -1 && relativeUrl.indexOf('.') != -1 
                    && relativeUrl.indexOf('.') < relativeUrl.indexOf('/')) { // Url has domain in it
            protocol = absoluteUrl.split(/^(([^:\/?#]+):)?(\/\/([^\/?#]*))?()?/)[2];
            return protocol+'://'+relativeUrl
        } else { // Url is truly relative
            return absoluteUrl.replace(/\/$/g, '') + '/' + relativeUrl;
        }
    };

    var that = this;

    this.crawl = function(website, callback) {
        console.log('in crawler', website);
        if (sameDomain && typeof website == 'string') {
            var domain = website.split(/^(([^:\/?#]+):)?(\/\/([^\/?#]*))?()?/)[4];
            var protocol = website.split(/^(([^:\/?#]+):)?(\/\/([^\/?#]*))?()?/)[2];
            allowedDomains.push('^'+protocol+'://([a-z0-9]*\\.)?'+domain);
        }
        if (typeof website == 'string') {
            website = { depth: 1, text: 'main', href: website, links: [], crawled: false};
            allLinks = website;
        }

        if (website.depth <= maxDepth  // max depth not reached
            && website.href.indexOf('http') != -1 // url is absolute
            && (!sameDomain || new RegExp(allowedDomains.join("|")).test(website.href)) // website is in list of allowed domains
            ) {
            request.get(website.href, function(err, res) {
                console.log(website.href);
                requestsMade+=1;
                if (!!err) {
                    requestsErrors+=1;
                    console.log('An error has occured', err);
                    callback(err, results);
                } else {
                    requestsSuccess+=1;
                    jsdom.env({
                        html: res.body,
                        src: [jquery],
                        done: function (err, window) {
                            website.crawled = true;
                            if (err) {
                                if (!!callback) callback(err, results);
                            } else {
                                var $ = window.$;
                                var pageLinks = $('a');
                                console.log(pageLinks.length);
                                if (pageLinks.length > maxLinks) {
                                    callback(new Error("Too many links on page"), results);
                                } else {
                                    async.each(pageLinks, function(pageLink, done) {
                                        var l = pageLink;
                                        var href = $(l).attr('href');
                                        if (!!href) {
                                            var link = {
                                                depth: website.depth+1,
                                                text: $(l).text(),
                                                href: that.getAbsoluteUrl(website.href, href),
                                                links: [],
                                                crawled: false
                                            };
                                            var match = new RegExp(defaults.links.join("|")).exec(link.href);
                                            var matchBlacklisted = new RegExp(defaults.blacklisted.join("|")).exec(link.href);
                                            if (!!match && !matchBlacklisted) {
                                                var result = {source: match[0], link: link.href};
                                                if (!_.findWhere(results, result)) {
                                                    console.log(result);
                                                    results.push(result);
                                                }
                                            }

                                            website.links.push(link);
                                            if (!new RegExp(notAllowed.join("|")).test(link.href) && linkCrawledIndex.indexOf(link.href) == -1) {
                                                linkCrawledIndex.push(link.href);
                                                that.crawl(link, function(err, res) {
                                                    done(err, res);
                                                });
                                            } else {
                                                done(null, null);
                                            }
                                        } else {
                                            done(null, null);
                                        }
                                    }, function(err, res) {
                                        if (!!callback) callback(err, results);
                                    });
                                }
                            }
                        }
                    });
                }
            });
        } else {
            if (!!callback) callback(null, results);
        }
    }
    this.crawl(website, mainCallback);
}


module.exports = fetch;
