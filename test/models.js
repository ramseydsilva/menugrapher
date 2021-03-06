var User = require('../models/User'),
    should = require('should'),
    util = require('./util');

describe('User Model', function() {

    before(function(done) {
        util.loadDb(function(err, results) {
            done(err);
        });
    });

    it('should create a new user', function(done) {
        var user = new User({
            email: 'test@gmail.com',
            password: 'password'
        });
        user.save(function(err) {
            if (err) return done(err);
            done();
        });
    });

  it('should not create a user with the unique email', function(done) {
    var user = new User({
        email: 'test@gmail.com',
        password: 'password'
    });
    user.save(function(err) {
        if (err) err.code.should.equal(11000);
        done();
    });
  });

    it('should find user by email', function(done) {
        User.findOne({ email: 'test@gmail.com' }, function(err, user) {
            if (err) return done(err);
            user.email.should.equal('test@gmail.com');
            done();
        });
    });

    it('should delete a user', function(done) {
        User.remove({ email: 'test@gmail.com' }, function(err) {
            if (err) return done(err);
            done();
        });
    });

    after(util.after);
});
