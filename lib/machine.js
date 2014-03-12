import Ember from 'ember';
import { required, computed, typeOf, inspect } from 'ember';
import { capitalCamelize } from './utils';
import Transition from './transition';

var STATE_MACROS;
var ALL_MACRO;
var INITIAL_MACRO;

STATE_MACROS = [
  ALL_MACRO     = '$all',
  INITIAL_MACRO = '$initial'
];

export default Ember.Object.extend({
  stateEvents:       required(),
  initialState:      'initialized',
  isTransitioning:   computed.bool('activeTransitions.length'),
  activeTransitions: null,
  currentState:      null,

  target: computed(function(key, value) {
    return arguments.length === 1 ? this : value;
  }),

  init: function() {
    this._transitions_ = {};
    this.set('activeTransitions', []);
    this._load_();
    this.set('currentState', this.get('initialState'));
    this._installBooleanStateAccessors_();
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
    var target = this.get('target');
    var guardValue;
    var guardTarget;
    var result;

    if ((guardValue = this.get(guardProperty))) {
      guardTarget = this;
    } else if ((guardValue = target.get(guardProperty))) {
      guardTarget = target;
    } else {
      return inverse ? false : true;
    }

    if (typeOf(guardValue) === 'function') {
      result = guardValue.call(guardTarget, this) ? true : false;
    } else {
      result = guardValue;
    }

    return inverse ? !result : result;
  },

  transitionFor: function(event, args) {
    var currentState = this.get('currentState');
    var stateMaps    = this.stateMapsFor(event);
    var hadGuard     = false;
    var guardValue;
    var inverse;
    var params;
    var iterParams;
    var i;

    for (i = 0; i < stateMaps.length; i++) {
      iterParams = stateMaps[i][currentState];

      if (!iterParams) {
        continue;
      }

      if ((guardValue = iterParams['if'])) {
        inverse  = false;
        hadGuard = true;
      } else if ((guardValue = iterParams.unless)) {
        inverse  = true;
        hadGuard = true;
      }

      if (guardValue) {
        if (this.checkGuard(guardValue, inverse)) {
          params = iterParams;
          break;
        } else {
          continue;
        }
      }

      params = iterParams;
      break;
    }

    if (!params) {
      throw new Ember.Error('no ' + (hadGuard ? 'unguarded ' : '')  +
      'transition was defined for event ' + event + ' in state ' +
      currentState);
    }

    params.fsm       = this;
    params.eventArgs = args;

    return Transition.create(params);
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

  _normalizeTransitionDefinition: function(params) {
    var defn      = {};
    var fromState = params.from;
    var toState   = params.to;

    if (!fromState || !toState) {
      throw new Ember.Error(
        'transition needs to specify both a from state and a to state: ' +
        Ember.inspect(params)
      );
    }

    if (STATE_MACROS.contains(fromState)) {
      defn.fromStatesMacro = fromState;
    } else if (typeOf(fromState) === 'array') {
      defn.fromStates = fromState;
    } else {
      defn.fromStates = [fromState];
    }

    defn.toState = toState;
    defn['if']   = params['if'];
    defn.unless  = params.unless;

    defn.userCallbacks = {
      beforeEvent:    params.before || params.beforeEvent,
      willExitState:  params.willExit || params.willExitState,
      willEnterState: params.willEnter || params.willEnterState,
      didExitState:   params.didExit || params.didExitState,
      didEnterState:  params.action || params.actions || params.didEnter || params.didEnterState,
      afterEvent:     params.after || params.afterEvent
    };

    return defn;
  },

  _normalizeTransitionPayload: function(payload) {
    var defs = [];
    var fromState;
    var toState;

    if (typeOf(payload) === 'array') {
      payload.forEach(function(params) {
        defs.push(this._normalizeTransitionDefinition(params));
      }, this);
    } else if (typeOf(payload) === 'object') {
      for (fromState in payload) {
        toState = payload[fromState];
        defs.push(this._normalizeTransitionDefinition({
          from: fromState,
          to: toState
        }));
      }
    } else {
      throw new Ember.Error('transitions must be an object or an array');
    }

    return defs;
  },

  _load_: function() {
    var definition = this.get('stateEvents');
    var eventNames = [];
    var stateNames = [];
    var eventName;
    var eventPayload;
    var transPayload;
    var transDefs;
    var i;

    definition.error = { transitions: { $all: 'failed' } };

    for (eventName in definition) {
      eventPayload = definition[eventName];
      transPayload = (eventPayload.transitions || eventPayload.transition);
      transDefs    = this._normalizeTransitionPayload(transPayload);

      eventNames.push(eventName);
      this._transitions_[eventName] = transDefs;

      for (i = 0; i < transDefs.length; i++) {
        if (transDefs[i].fromStates) {
          stateNames.addObjects(transDefs[i].fromStates);
        }

        stateNames.addObject(transDefs[i].toState);
      }
    }

    this.set('stateNames', stateNames);
    this.set('eventNames', eventNames);
  },

  _installBooleanStateAccessors_: function() {
    var mixin  = {};
    var states = this.get('stateNames');
    var key;
    var accessorProperties = [];

    states.forEach(function(state) {
      var parts = state.split('.');

      if (parts.length > 1) {
        parts.forEach(function(part, index) {
          var substate;

          if (index === parts.length) {
            return;
          }

          substate = parts.slice(0, index).join('.');

          mixin['is' + capitalCamelize(substate)] = computed(function() {
            return this.inState(substate);
          }).property(state);
        });
      }

      mixin['is' + capitalCamelize(state)] = computed(function() {
        return this.inState(state);
      }).property('currentState');
    }, this);

    for (key in mixin) {
      accessorProperties.push(key);
    }

    this._booleanStateAccessors_ = accessorProperties;
    this.reopen(mixin);
  }
});
