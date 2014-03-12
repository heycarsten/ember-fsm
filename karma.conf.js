module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'chai', 'sinon'],

    files: [
      'bower_components/jquery/jquery.js',
      'bower_components/handlebars/handlebars.js',
      'bower_components/ember/ember.js',
      'bower_components/sinon/index.js',
      'dist/globals/main.js',
      'http://localhost:4200/globals/main.js',
      'test/**/*.spec.js'
    ],

    client: {
      mocha: {
        ui: 'tdd'
      }
    },

    basePath: '',
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['Chrome'],
    captureTimeout: 60000,
    singleRun: true
  });
};
