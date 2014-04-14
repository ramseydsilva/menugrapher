#! /usr/bin/env node

var mongoose = require('mongoose'),
    nconf = require('nconf');
    _ = require('underscore'),
    Category = require('../models/category'),
    Restaurant = require('../models/restaurant'),
    City = require('../models/city');

// Load configurations depending on the environment
nconf.argv().env();
nconf.file({ file: __dirname + '/../config/' + nconf.get('env') + '/config.json' });
nconf.defaults({ 
    'env': 'dev',
    'rootDirPrefix': ''
});
nconf.argv().env().file({ file: __dirname + '/../config/' + nconf.get('env') + '/config.json' });
var db = nconf.get('db:host') + ':' + nconf.get('db:port') + '/' + nconf.get('db:name');

mongoose.connect(db, function(err) {
    if (!!err) throw err;

    var cities = City.find({}).exec(function(err, docs) {
        _.each(docs, function(doc) {
            doc.save();
        });
    });

    var restaurants = Restaurant.find({}).exec(function(err, docs) {
        _.each(docs, function(doc) {
            doc.save();
        });
    });

    var categories = Category.find({}).exec(function(err, docs) {
        _.each(docs, function(doc) {
            doc.save();
        });
    });

});
