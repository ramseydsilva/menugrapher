var request = require('supertest'),
    util = require('./util'),
    app = require('../app.js');

describe('Main pages ', function() {
    before(util.loadDb);
    it('GET / should return 200 OK', function(done) {
        request(app).get('/').end(function(err, res) {
            done(err);
        });
    });

  it('GET /login should return 200 OK', function(done) {
    request(app)
      .get('/login')
      .expect(200, done);
  });

  it('GET /signup should return 200 OK', function(done) {
    request(app)
      .get('/signup')
      .expect(200, done);
  });

  it('GET /api should return 200 OK', function(done) {
    request(app)
      .get('/api')
      .expect(200, done);
  });

  it('GET /contact should return 200 OK', function(done) {
    request(app)
      .get('/contact')
      .expect(200, done);
  });

  it('GET /random-url should return 404', function(done) {
    request(app)
      .get('/reset')
      .expect(404, done);
  });

    after(util.after);
});
