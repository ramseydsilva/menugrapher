databaseType = 'mongo';

if(!databaseType) {
    winston.info('Database type not set! Run node app --setup');
    process.exit();
}

var db = require('./database/' + databaseType);

module.exports = db;
