"use strict";
var Ember = require("ember")["default"] || require("ember");
var computed = require("ember").computed;
var typeOf = require("ember").typeOf;
var inspect = require("ember").inspect;
var on = require("ember").on;
var capitalCamelize = require("./utils").capitalCamelize;
var Transition = require("./transition")["default"] || require("./transition");
var Definition = require("./definition")["default"] || require("./definition");

exports["default"] = Ember.Object.extend({
  isTransitioning:   false,
  events:            null,
  states:            null,
  activeTransitions: null,
  currentState:      null,
  initialState:      null,

  init: function() {
    var target = this.get('target');
    var events = this.get('events');
    var states = this.get('states');

    if (!target) {
      this.set('target', this);
    }

    if (events && !events.error) {
      events.error = { transition: { $all: 'failed' } };
    }

    this.set('activeTransitions', []);

    this.definition = new Definition({
      states: states,
      events: events
    });

    this.set('stateNames',   this.definition.stateNames);
    this.set('eventNames',   this.definition.eventNames);
    this.set('currentState', this.get('initialState') || this.definition.initialState);
  },

  send: function(event) {
    var args = [].slice.call(arguments, 1, arguments.length);
    var fsm = this;
    var transition;
    var promise;
    var sameState;

    if (!this.get('eventNames').contains(event)) {
      throw new Ember.Error(
        'unknown state event "' + event + '" try one of [' +
        this.get('eventNames').join(', ') + ']'
      );
    }

    transition = this.transitionFor(event, args);
    sameState  = transition.toState === this.get('currentState');

    if (this.get('isTransitioning') && !sameState) {
      throw new Ember.Error(
        'unable to transition out of "' + this.get('currentState') + '" ' +
        'state to "' + transition.toState + '" state while transitions are ' +
        'active: ' + inspect(this.get('activeTransitions'))
      );
    }

    promise = transition.perform();

    promise.catch(function(error) {
      fsm.abortActiveTransitions();
      fsm.send('error', {
        error: error,
        transition: transition
      });
    });

    return promise;
  },

  abortActiveTransition: function(transition) {
    if (this.hasActiveTransition(transition)) {
      transition.abort();
      this.removeActiveTransition(transition);
    }
  },

  hasActiveTransition: function(transition) {
    return this.get('activeTransitions').contains(transition);
  },

  abortActiveTransitions: function() {
    var activeTransitions = this.get('activeTransitions');

    while (activeTransitions.length) {
      activeTransitions.popObject().abort();
    }

    this.set('isTransitioning', false);
  },

  pushActiveTransition: function(transition) {
    var activeTransitions = this.get('activeTransitions');

    activeTransitions.pushObject(transition);

    if (activeTransitions.get('length')) {
      this.set('isTransitioning', true);
    }
  },

  removeActiveTransition: function(transition) {
    var activeTransitions = this.get('activeTransitions');

    activeTransitions.removeObject(transition);

    if (!activeTransitions.get('length')) {
      this.set('isTransitioning', false);
    }
  },

  checkGuard: function(guardProperty, isInverse) {
    var target     = this.get('target');
    var guardValue = target.get(guardProperty);
    var result;

    if (guardValue === undefined) {
      throw new Error('expected guard "' + guardProperty + '" on target "' +
      target + '" to be defined');
    } else if (typeOf(guardValue) === 'function') {
      result = guardValue.call(this) ? true : false;
    } else {
      result = guardValue ? true : false;
    }

    return isInverse ? !result : result;
  },

  outcomeOfPotentialTransitions: function(potentials) {
    var target = this.get('target');
    var potential;
    var outcomeParams;
    var i;

    if (!potentials.length) {
      return null;
    }

    for (i = 0; i < potentials.length; i++) {
      potential = potentials[i];

      if (!potential.isGuarded) {
        outcomeParams = potential;
        break;
      }

      if (potential.doIf && this.checkGuard(potential.doIf)) {
        outcomeParams = potential;
        break;
      }

      if (potential.doUnless && this.checkGuard(potential.doUnless, true)) {
        outcomeParams = potential;
        break;
      }
    }

    if (!outcomeParams) {
      return null;
    }

    outcomeParams.machine = this;
    outcomeParams.target  = target;

    return outcomeParams;
  },

  transitionFor: function(event, args) {
    var currentState = this.get('currentState');
    var potentials   = this.definition.transitionsFor(event, currentState);
    var transitionParams;

    if (!potentials.length) {
      throw new Ember.Error('no transition is defined for event "' + event +
      '" in state "' + currentState + '"');
    }

    transitionParams = this.outcomeOfPotentialTransitions(potentials);

    if (!transitionParams) {
      throw new Ember.Error('no unguarded transition was resolved for event "' +
      event + '" in state "' + currentState + '"');
    }

    transitionParams.eventArgs = args;

    return Transition.create(transitionParams);
  },

  inState: function(stateOrPrefix) {
    var currentState = this.definition.lookupState(this.get('currentState'));
    var states       = this.definition.lookupStates(stateOrPrefix);

    return states.contains(currentState);
  },

  canEnterState: function(state) {
    var currentState = this.definition.lookupState(this.get('currentState'));
    var potentials;

    potentials = currentState.exitTransitions.filter(function(t) {
      return t.toState === state;
    });

    return this.outcomeOfPotentialTransitions(potentials) ? true : false;
  },

  _setNewState_: function(transition) {
    this.set('currentState', transition.get('toState'));
  },

  _activateTransition_: function(transition) {
    this.pushActiveTransition(transition);
  },

  _deactivateTransition_: function(transition) {
    this.removeActiveTransition(transition);
  },

  _setupIsStateAccessors: on('init', function() {
    var mixin = {};
    var prefixes = this.definition.stateNamespaces.slice(0);
    var properties = [];
    var prefix;
    var i;

    function addAccessor(prefix) {
      var property = ('isIn' + capitalCamelize(prefix));

      properties.push(property);

      mixin[property] = computed(function() {
        return this.inState(prefix);
      }).property('currentState');
    }

    for (i = 0; i < this.definition.stateNames.length; i++) {
      prefix = this.definition.stateNames[i];

      if (prefixes.indexOf(prefix) !== -1) {
        continue;
      }

      prefixes.push(prefix);
    }

    for (i = 0; i < prefixes.length; i++) {
      addAccessor(prefixes[i]);
    }

    this.isInStateAccessorProperties = properties;
    this.reopen(mixin);
  })
});