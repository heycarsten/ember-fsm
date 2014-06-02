var package = require('broccoli-dist-es6-module');

module.exports = package('lib', {
  global:      'Ember.FSM',
  packageName: 'ember-fsm',
  main:        'ember-fsm',

  shim: {
    'ember':        'Ember',
    'ember/rsvp':   'Ember.RSVP',
    'ember/string': 'Ember.String'
  }
});
