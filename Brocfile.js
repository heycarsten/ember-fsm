module.exports = function(broccoli) {
  return require('broccoli-dist-es6-module')(broccoli.makeTree('lib'), {
    global:      'Ember.FSM',
    packageName: 'ember-fsm',
    main:        'main',

    shim: {
      'ember':        'Ember',
      'ember/rsvp':   'Ember.RSVP',
      'ember/string': 'Ember.String'
    }
  });
};
