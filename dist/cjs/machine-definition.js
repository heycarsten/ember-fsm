"use strict";
var ownPropertiesOf = require("./utils").ownPropertiesOf;
var toArray = require("./utils").toArray;

exports["default"] = MachineDefinition;

var ALL_MACRO      = '$all';
var SAME_MACRO     = '$same';
var INITIALIZED    = 'initialized';
var TRANSITIONS    = ['transition', 'transitions'];
var INITIAL_STATES = ['initialState'];
var KNOWN_STATES   = ['explicitStates', 'knownStates'];
var BEFORES        = ['before', 'beforeEvent'];
var AFTERS         = ['after', 'afterEvent'];
var WILL_ENTERS    = ['willEnter'];
var DID_ENTERS     = ['didEnter'];
var WILL_EXITS     = ['willExit'];
var DID_EXITS      = ['didExit'];
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

  this._payload      = payload;
  this._statesByName = {};
  this._eventsByName = {};
  this._stateConf    = {};

  if (payload.states) {
    this._stateConf = destructDefinition(payload.states, 'states');
  } else {
    this._stateConf = {};
  }

  this.isExplicit   = false;
  this.initialState = INITIALIZED || this._stateConf.initialState;
  this.states       = [];
  this.stateNames   = [];
  this.events       = [];
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
  var i;
  var j;

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
    fromTransitions: [],
    toTransitions: [],
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
  var event = {
    name: name,
    transitions: []
  };

  updateEvent(event, payload);

  return event;
}

function updateEvent(event, payload) {
  var definition  = destructDefinition(payload, 'event');
  var transitions = definition.transitions;
  var i;

  for (i = 0; i < transitions.length; i++) {
    event.transitions.push(allocEventTransition(event, transitions[i]));
  }

  return event;
}

function allocEventTransition(event, payload) {
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
    throw new Error('You can only have one fromState: "toState" pair per ' +
    'transition. Consider using the from: ["states"], to: "state" form ' +
    'instead');
  }

  if (fromToSpecifiedByKVP) {
    def.fromStates = [data[0]];
    def.toState    = payload[data[0]];
  }

  return def;
}

MachineDefinition.prototype = {
  lookupState: function(name) {
    return this._statesByName[name];
  },

  _compileStates: function() {
    this._allocateExplicitStates();
    this._applyStateDefinitions();
  },

  _allocateExplicitStates: function() {
    var states = this._stateConf.knownStates;
    var i;
    var stateName;

    if (!states) {
      return;
    }

    this.isExplicit = true;

    for (i = 0; i < states.length; i++) {
      stateName = states[i];
      this.stateNames.push(stateName);
      this._allocState(stateName);
    }
  },

  _applyStateDefinitions: function() {
    var payload = this._payload.states;
    var stateName;

    for (stateName in payload) {
      this._updateState(stateName, payload[stateName]);
    }
  },

  _allocState: function(name, def) {
    var state;

    if (this.lookupState(name)) {
      throw new Error('state ' + name + ' has already been allocated');
    }

    state = allocState(name, def);

    this.states.push(state);
    this._statesByName[name] = state;

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

    return this._allocState(name, payload);
  },

  _compileEvents: function() {
    var payload = this._payload.events;
    var eventName;

    console.log(payload);

    for (eventName in payload) {
      this._compileEvent(eventName, payload[eventName]);
    }

    if (!this.events.length) {
      throw new Error('no events specified, at least one event must be ' +
      'specified');
    }
  },

  _compileEvent: function(name, payload) {
    var event = this._allocEvent(name, payload);
    this.events.push(event);
    this._eventsByName[name] = event;
  },

  _allocEvent: function(name, payload) {
    return allocEvent(name, payload);
  },

  _unwindTransitions: function() {
    var i;
    var j;
    var k;
    var event;
    var transition;
    var fromState;
    var set = {};
    var implicitStates;
    var explicitState;

    function addState(stateName) {
      set[stateName] = stateName;
    }

    for (i = 0; i < this.events.length; i++) {
      event = this.events[i];

      for (j = 0; j < event.transitions.length; j++) {
        transition = event.transitions[j];

        if (transition.toState === SAME_MACRO) {
          continue;
        } else {
          this._updateState(transition.toState);
          addState(transition.toState);
        }

        for (k = 0; k < transition.fromStates.length; k++) {
          fromState = transition.fromStates[k];

          if (fromState === ALL_MACRO) {
            continue;
          } else {
            this._updateState(fromState);
            addState(fromState);
          }
        }
      }
    }

    if (!this.isExplicit) {
      return;
    }

    implicitStates = ownPropertiesOf(set);

    for (i = 0; i < this.stateNames.length; i++) {
      explicitState = this.stateNames[i];

      if (!implicitStates.contains(explicitState)) {
        throw new Error('' + explicitState + ' state is not used in any ' +
        'transitions; it is explicitly defined to be used');
      }
    }
  },

  _allocTransition: function(payload) {

  },

  _unwindTransition: function(transition) {
    allocTransition()
  },

  _runAfterCompile: function() {
    this.stateNames = ownPropertiesOf(this._statesByName);
  },

  _compile: function() {
    this._compileStates();
    this._compileEvents();
    this._unwindTransitions();
    this._runAfterCompile();
  }
};