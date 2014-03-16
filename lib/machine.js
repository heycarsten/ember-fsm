import Ember from 'ember';
import { computed, typeOf, inspect, on, get } from 'ember';
import { capitalCamelize } from './utils';
import Transition from './transition';
import Definition from './definition';

var ERROR_EVENT = { transition: { $all: 'failed' } };

function checkGuard(target, args, guardProperty, isInverse) {
  var guardValue = get(target, guardProperty);
  var result;

  if (!guardValue) {
    result = false;
  } else if (typeOf(guardValue) === 'function') {
    result = guardValue.apply(target, args) ? true : false;
  } else {
    result = guardValue ? true : false;
  }

  return isInverse ? !result : result;
}

export default Ember.Object.extend({
  isTransitioning:   computed.bool('activeTransitions.length'),
  events:            null,
  states:            null,
  activeTransitions: null,
  currentState:      null,

  init: function() {
    var target = this.get('target');
    var events = this.get('events');
    var states = this.get('states');

    if (!target) {
      this.set('target', this);
    }

    if (!events.error) {
      events.error = ERROR_EVENT;
    }

    this.set('activeTransitions', []);

    this.definition = new Definition({
      states: states,
      events: events
    });

    this.set('stateNames',   this.definition.stateNames);
    this.set('eventNames',   this.definition.eventNames);
    this.set('currentState', this.definition.initialState);
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
        'unable to transition out of ' + this.get('currentState') + ' state ' +
        'while transitions are active ' +
        inspect(this.get('activeTransitions'))
      );
    }

    this.pushActiveTransition(transition);

    promise = transition.perform();

    promise.catch(function(error) {
      fsm.send('error', error);
    });

    promise.finally(function() {
      fsm.removeActiveTransition(transition);
    });

    return transition;
  },

  pushActiveTransition: function(transition) {
    this.get('activeTransitions').pushObject(transition);
  },

  removeActiveTransition: function(transition) {
    this.get('activeTransitions').removeObject(transition);
  },

  transitionFor: function(event, args) {
    var currentState = this.get('currentState');
    var target       = this.get('target');
    var potentials   = this.definition.transitionsFor(event, currentState);
    var potential;
    var transitionParams;
    var i;

    if (!potentials.length) {
      throw new Ember.Error('no transition is defined for event "' + event +
      '" in state "' + currentState + '"');
    }

    for (i = 0; i < potentials.length; i++) {
      potential = potentials[i];

      if (!potential.hasGuard) {
        transitionParams = potential;
        break;
      }

      if (potential.doIf && checkGuard(target, args, potential.doIf)) {
        transitionParams = potential;
        break;
      }

      if (potential.doUnless && checkGuard(target, args, potential.doUnless, true)) {
        transitionParams = potential;
        break;
      }
    }

    if (!transitionParams) {
      throw new Ember.Error('no unguarded transition was resolved for event "' +
      event + '" in state "' + currentState + '"');
    }

    transitionParams.machine   = this;
    transitionParams.eventArgs = args;

    return Transition.create(transitionParams);
  },

  inState: function(state) {
    var currentState = this.get('currentState');

    if (currentState === state) {
      return true;
    }

    if (currentState.slice(0, state.length) === state) {
      return true;
    }

    return false;
  },

  _setNewState_: function(transition) {
    this.set('currentState', transition.get('toState'));
  },

  _setupBooleanStateAccessors: on('init', function() {
    var mixin  = {};
    var states = this.definition.stateNames;
    var accessorProperties = [];
    var state;
    var parts;
    var part;
    var i, j;

    function addCp(state) {
      var property = ('is' + capitalCamelize(state));

      mixin[property] = computed(function() {
        return this.inState(state);
      }).property('currentState');

      accessorProperties.push(property);
    }

    for (i = 0; i < states.length; i++) {
      state = states[i];
      parts = state.split('.');

      if (parts.length > 1) {
        for (j = 0; j < parts.length; j++) {
          part = parts[j];

          if (j === parts.length) {
            continue;
          }

          addCp(parts.slice(0, j).join('.'));
        }
      }

      addCp(state);
    }

    this.stateAccessors = accessorProperties;
    this.reopen(mixin);
  })
});
