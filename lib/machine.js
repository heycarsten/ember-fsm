import Ember from 'ember';
import { computed, typeOf, inspect, on } from 'ember';
import { capitalCamelize } from './utils';
import Transition from './transition';
import MachineDefinition from './machine-definition';

var STATE_MACROS;
var ALL_MACRO;
var INITIAL_MACRO;

STATE_MACROS = [
  ALL_MACRO     = '$all',
  INITIAL_MACRO = '$initial'
];

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
      events.error = { transition: { $all: 'failed' } };
    }

    this.set('activeTransitions', []);

    this.definition = new MachineDefinition({
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
        'unknown state event ' + inspect(event) + ' try one of [' +
        this.get('eventNames').join(', ') + ']'
      );
    }

    transition = this.transitionFor(event, args);
    sameState  = transition.toState === this.get('currentState');

    if (this.get('isTransitioning') && !sameState) {
      throw new Ember.Error(
        'unable to transition out of ' + this.get('currentState') + ' state ' +
        'while transitions are active: ' +
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

  stateMapsFor: function(event) {
    var defs = this._transitions_[event];
    var maps = [];

    defs.forEach(function(def) {
      var map = {};
      var macro;
      var fromStates;

      if (macro = def.fromStatesMacro) {
        if (macro === ALL_MACRO) {
          fromStates = [this.get('initialState')];
        } else if (macro === INITIAL_MACRO) {
          fromStates = this.get('stateNames');
        } else {
          throw new Ember.Error('unknown state macro: ' + inspect(macro));
        }
      } else {
        fromStates = def.fromStates;
      }

      fromStates.forEach(function(fromState) {
        var copy = {};
        var key;

        for (key in def) {
          copy[key] = def[key];
        }

        copy.fromState = fromState;
        copy.event     = event;

        delete copy.fromStatesMacro;
        delete copy.fromStates;

        map[fromState] = copy;
      });

      maps.push(map);
    }, this);

    return maps;
  },

  checkGuard: function(guardProperty, inverse) {
    var target     = this.get('target');
    var guardValue = target.get(guardProperty);
    var result;

    if (!guardValue) {
      result = false;
    } else if (typeOf(guardValue) === 'function') {
      result = guardValue.call(target, this) ? true : false;
    } else {
      result = guardValue ? true : false;
    }

    return inverse ? !result : result;
  },

  transitionFor: function(event, args) {
    var currentState = this.get('currentState');
    var potentials   = this.definition.transitionsFor(event, currentState);
    var copy         = {};
    var potential;
    var found;
    var key;
    var i;

    if (!potentials.length) {
      throw new Ember.Error('no transition is defined for event "' + event +
      '" in state "' + currentState + '"');
    }

    for (i = 0; i < potentials.length; i++) {
      potential = potentials[i];

      if (!potential.hasGuard) {
        found = potential;
        break;
      }

      if (potential.doIf && this.checkGuard(potential.doIf)) {
        found = potential;
        break;
      }

      if (potential.doUnless && this.checkGuard(potential.doUnless)) {
        found = potential;
        break;
      }
    }

    if (!found) {
      throw new Ember.Error('no unguarded transition was resolved for event "' +
      event + '" in state "' + currentState + '"');
    }

    for (key in found) {
      copy[key] = found[key];
    }

    copy.machine   = this;
    copy.eventArgs = args;

    return Transition.create(copy);
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
