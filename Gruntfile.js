'use strict';

var grunt = require('grunt');

grunt.loadNpmTasks("grunt-remove-logging");

grunt.initConfig({
  removelogging: {
    dist: {
      src: "dist/**/*.js" // Each file will be overwritten with the output!
    }
  }
});
