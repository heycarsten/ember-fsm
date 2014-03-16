import Ember from 'ember';
import { computed, typeOf, inspect, on } from 'ember';
import { capitalCamelize } from './utils';
import Transition from './transition';
import Definition from './definition';

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

  _setupIsStateAccessors: on('init', function() {
    var mixin = {};
    var prefixes = this.definition.stateNamespaces.slice(0);
    var properties = [];
    var prefix;
    var i;

    function addAccessor(prefix) {
      var property = ('is' + capitalCamelize(prefix));

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

    this.inStateAccessorProperties = properties;
    this.reopen(mixin);
  })
});
