module.exports = require('broccoli-dist-es6-module')('lib', {
  global:      'Ember.FSM',
  packageName: 'ember-fsm',
  main:        'main',

  shim: {
    'ember':        'Ember',
    'ember/rsvp':   'Ember.RSVP',
    'ember/string': 'Ember.String'
  }
});
