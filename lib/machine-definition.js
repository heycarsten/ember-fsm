import { ownPropertiesOf, toArray } from './utils';

export default MachineDefinition;

var ALL_MACRO      = '$all';
var SAME_MACRO     = '$same';
var INITIALIZED    = 'initialized';
var TRANSITIONS    = ['transition', 'transitions'];
var INITIAL_STATES = ['initialState'];
var KNOWN_STATES   = ['explicitStates', 'knownStates'];
var BEFORES        = ['before', 'beforeEvent'];
var AFTERS         = ['after', 'afterEvent'];
var WILL_ENTERS    = ['willEnter'];
var DID_ENTERS     = ['didEnter', 'enter', 'action'];
var WILL_EXITS     = ['willExit'];
var DID_EXITS      = ['didExit', 'exit'];
var DO_IFS         = ['doIf', 'runIf', 'guard'];
var DO_UNLESSES    = ['doUnless', 'runUnless', 'unless'];
var FROMS          = ['from', 'fromState', 'fromStates'];
var TOS            = ['to', 'toState'];

// normalized name, definition names, toArray
var DEFMAP = {
  transition: [
    ['fromStates',  FROMS,       true],
    ['toState',     TOS,         false],
    ['beforeEvent', BEFORES,     true],
    ['afterEvent',  AFTERS,      true],
    ['willEnter',   WILL_ENTERS, true],
    ['didEnter',    DID_ENTERS,  true],
    ['willExit',    WILL_EXITS,  true],
    ['didExit',     DID_EXITS,   true],
    ['doIf',        DO_IFS,      false],
    ['doUnless',    DO_UNLESSES, false]
  ],

  event: [
    ['transitions', TRANSITIONS, true]
  ],

  states: [
    ['initialState', INITIAL_STATES, false],
    ['knownStates',  KNOWN_STATES,   true]
  ],

  state: [
    ['willEnter', WILL_ENTERS, true],
    ['didEnter',  DID_ENTERS,  true],
    ['willExit',  WILL_EXITS,  true],
    ['didExit',   DID_EXITS,   true]
  ]
};

function MachineDefinition(payload) {
  if (!(this instanceof MachineDefinition)) {
    throw new TypeError('please use the "new" operator to construct a ' +
    'MachineDefinition instance');
  }

  if (typeof payload !== 'object') {
    throw new TypeError('you must pass an object containing and "events" ' +
    'property as the sole argument to the Compiler constructor');
  }

  if (!payload.events) {
    throw new TypeError('"events" must be defined');
  }

  if (typeof payload.events !== 'object') {
    throw new TypeError('"events" must be an object');
  }

  if (payload.states && typeof payload.states !== 'object') {
    throw new TypeError('"states" must be an object');
  }

  this._payload = payload;
  this._statesDef = destructDefinition(payload.states || {}, 'states');
  this._stateByName = {};
  this._eventByName = {};
  this._transitionsByEvent = {};
  this._transitionsByEventFromState = {};

  this.isExplicit   = false;
  this.initialState = this._statesDef.initialState || INITIALIZED;
  this.states       = [];
  this.stateNames   = [];
  this.events       = [];
  this.eventNames   = [];
  this.transitions  = [];

  this._compile();
}

// Extracts definition keys and leaves behind "data", for example consider the
// "states" node below:
//
// payload = {
//   states: {
//     initialState: 'ready',
//     knownStates: 'ready',
//
//     ready: {
//       willEnter: 'notifySomeone'
//     }
//   }
// };
//
// definition = destructDefinition(payload.states, 'states');
// definition => { initialState: 'ready', knownStates: ['ready'] }
// payload    => { ready: { willEnter: 'notifySomeone' } }
function destructDefinition(payload, type) {
  var map = DEFMAP[type];
  var def = {};
  var property;
  var aliases;
  var makeArray;
  var value;
  var i, j;

  if (!payload) {
    throw new TypeError('Expected payload object');
  }

  if (!map) {
    throw new TypeError('type is unknown: ' + type);
  }

  for (i = 0; i < map.length; i++) {
    property  = map[i][0];
    aliases   = map[i][1];
    makeArray = map[i][2];

    for (j = 0; j < aliases.length; j++) {
      value = payload[aliases[j]];

      if (value !== undefined) {
        delete payload[aliases[j]];
        break;
      }
    }

    if (makeArray) {
      value = toArray(value);
    }

    def[property] = value;
  }

  return def;
}

function allocState(name, payload) {
  var state = {
    name: name,
    willEnter: null,
    didEnter: null,
    willExit: null,
    didExit: null
  };

  updateState(state, payload);

  return state;
}

function updateState(state, payload) {
  var definition;
  var property;

  if (!payload) {
    return state;
  }

  definition = destructDefinition(payload, 'state');

  for (property in definition) {
    state[property] = definition[property];
  }

  return state;
}

function allocEvent(name, payload) {
  var definition = destructDefinition(payload, 'event');
  var woundTransitions = definition.transitions;
  var i;
  var event;

  event = {
    name: name,
    _woundTransitions: []
  };

  for (i = 0; i < woundTransitions.length; i++) {
    event._woundTransitions.push(
      allocWoundTransition(event, woundTransitions[i])
    );
  }

  return event;
}

function allocWoundTransition(event, payload) {
  var def  = destructDefinition(payload, 'transition');
  var data = ownPropertiesOf(payload);
  var fromToSpecifiedByName;
  var fromToSpecifiedByKVP;

  fromToSpecifiedByName = def.fromStates.length > 0 && def.toState;
  fromToSpecifiedByKVP  = data.length ? true : false;

  if (fromToSpecifiedByName && fromToSpecifiedByKVP) {
    throw new Error('You must specify transition states using either form: ' +
    '"state", to: "state" or fromState: "toState" not both');
  }

  if (!fromToSpecifiedByName && !fromToSpecifiedByKVP) {
    throw new Error('You must specify states to transition from and to in ' +
    'event transitions.');
  }

  if (fromToSpecifiedByKVP && data.length > 1) {
    throw new Error('only one { fromState: "toState" } pair can be ' +
    'specified per transition: specify multiple event transitions as an ' +
    'array of objects with one { fromState: \'toState\' } per object.');
  }

  if (fromToSpecifiedByKVP) {
    def.fromStates = [data[0]];
    def.toState    = payload[data[0]];
  }

  def.isGuarded = (def.doIf || def.doUnless) ? true : false;

  return def;
}

MachineDefinition.prototype = {
  lookupState: function(name) {
    return this._stateByName[name];
  },

  lookupEvent: function(name) {
    return this._eventByName[name];
  },

  transitionsFor: function(event, fromState) {
    var _this = this;
    var result;

    function fetch(name, key) {
      var found;

      if ((found = _this[name][key])) {
        return found;
      } else {
        _this[name][key] = [];
        return _this[name][key];
      }
    }

    if (event && fromState) {
      result = fetch('_transitionsByEventFromState', event + ':' + fromState);
    } else if (event) {
      result = fetch('_transitionsByEvent', event);
    }

    return result;
  },

  _compileStatesDefinition: function() {
    this._allocateExplicitStates();
    this._applyStateDefinitions();
  },

  _allocateExplicitStates: function() {
    var states = this._statesDef.knownStates;
    var i;

    if (!states.length) {
      return;
    }

    this.isExplicit = true;

    if (!this._statesDef.initialState && !states.contains(this.initialState)) {
      throw new Error('an explicit list of known states was defined but it ' +
      'does not contain the default initial state "' + this.initialState +
      '", either change initialState or include "' + this.initialState + '" ' +
      'in the list of known states');
    }

    this._allocateState(this.initialState);

    for (i = 0; i < states.length; i++) {
      this._allocateState(states[i]);
    }
  },

  _applyStateDefinitions: function() {
    var payload = this._payload.states;
    var stateName;

    for (stateName in payload) {
      this._updateState(stateName, payload[stateName]);
    }
  },

  _allocateState: function(name, payload) {
    var state;

    if (state = this.lookupState(name)) {
      return state;
    }

    state = allocState(name, payload);

    this.states.push(state);
    this._stateByName[name] = state;
    this.stateNames.push(name);

    return state;
  },

  _updateState: function(name, payload) {
    var found;

    if ((found = this.lookupState(name))) {
      return updateState(found, payload);
    }

    if (this.isExplicit) {
      throw new Error('' + name + ' is not a defined state, add it to the ' +
      'list of known states');
    }

    return this._allocateState(name, payload);
  },

  _compileEventDefinitions: function() {
    var payload = this._payload.events;
    var eventName;

    for (eventName in payload) {
      this._compileEventDefinition(eventName, payload[eventName]);
    }

    if (!this.events.length) {
      throw new Error('no events specified, at least one event must be ' +
      'specified to compile the state machine, COMMON!');
    }
  },

  _compileEventDefinition: function(name, payload) {
    var event = this._allocEvent(name, payload);
    this.events.push(event);
    this.eventNames.push(name);
    this._eventByName[name] = event;
  },

  _allocEvent: function(name, payload) {
    return allocEvent(name, payload);
  },

  _extractStatesFromTransitions: function() {
    var set = {};
    var implicitStates;
    var explicitState;
    var woundTransitions;
    var woundTransition;
    var fromState;
    var i, j, k;

    function addState(stateName) {
      set[stateName] = stateName;
    }

    for (i = 0; i < this.events.length; i++) {
      woundTransitions = this.events[i]._woundTransitions;

      for (j = 0; j < woundTransitions.length; j++) {
        woundTransition = woundTransitions[j];

        if (woundTransition.toState === SAME_MACRO) {
          continue;
        } else {
          this._updateState(woundTransition.toState);
          addState(woundTransition.toState);
        }

        for (k = 0; k < woundTransition.fromStates.length; k++) {
          fromState = woundTransition.fromStates[k];

          if (fromState === ALL_MACRO) {
            continue;
          } else {
            this._updateState(fromState);
            addState(fromState);
          }
        }
      }
    }

    implicitStates = ownPropertiesOf(set);

    if (!implicitStates.contains(this.initialState)) {
      throw new Error('initial state "' + this.initialState + '" is not ' +
      'specified in any transitions');
    }

    if (!this.isExplicit) {
      return;
    }

    for (i = 0; i < this.stateNames.length; i++) {
      explicitState = this.stateNames[i];

      if (!implicitStates.contains(explicitState)) {
        throw new Error('' + explicitState + ' state is not used in any ' +
        'transitions; it is explicitly defined to be used');
      }
    }
  },

  _unwindTransitions: function() {
    var woundTransitions;
    var woundTransition;
    var fromStates;
    var event;
    var eventName;
    var unwoundTransition;
    var fromState;
    var unguardedStatesSet;
    var toState;
    var key;
    var i, j, k;

    for (i = 0; i < this.events.length; i++) {
      event              = this.events[i];
      eventName          = event.name;
      woundTransitions   = event._woundTransitions;
      unguardedStatesSet = {};

      for (j = 0; j < woundTransitions.length; j++) {
        woundTransition   = woundTransitions[j];
        fromStates        = woundTransition.fromStates;

        if (fromStates.contains(ALL_MACRO)) {
          fromStates = this.stateNames;
        }

        for (k = 0; k < fromStates.length; k++) {
          fromState = fromStates[k];
          unwoundTransition = {};


          if (!woundTransition.isGuarded && unguardedStatesSet[fromState]) {
            throw new Error('you specified to transition from the "' +
            fromState + '" state in more than one transition for the "' +
            eventName + '" event');
          } else {
            unguardedStatesSet[fromState] = true;
          }

          if (woundTransition.toState === SAME_MACRO) {
            toState = fromState;
          } else {
            toState = woundTransition.toState;
          }

          for (key in woundTransition) {
            if (key === 'fromStates') {
              continue;
            }

            unwoundTransition[key] = woundTransition[key];
          }

          unwoundTransition.event     = eventName;
          unwoundTransition.fromState = fromState;
          unwoundTransition.toState   = toState;

          this.transitions.push(unwoundTransition);
          this.transitionsFor(eventName).push(unwoundTransition);
          this.transitionsFor(eventName, fromState).push(unwoundTransition);
        }
      }

      delete event._woundTransitions;
    }
  },

  _compile: function() {
    this._compileStatesDefinition();
    this._compileEventDefinitions();
    this._extractStatesFromTransitions();
    this._unwindTransitions();
  }
};
