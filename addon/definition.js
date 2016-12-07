import Ember from 'ember';
import { ownPropertiesOf, toArray, contains } from './utils';

const { copy } = Ember;

export default Definition;

const ALL_MACRO      = '$all';
const SAME_MACRO     = '$same';
const INITIAL_MACRO  = '$initial';
const INITIALIZED    = 'initialized';
const TRANSITIONS    = ['transition', 'transitions'];
const INITIAL_STATES = ['initialState'];
const KNOWN_STATES   = ['explicitStates', 'knownStates'];
const BEFORES        = ['before', 'beforeEvent'];
const AFTERS         = ['after', 'afterEvent'];
const WILL_ENTERS    = ['willEnter'];
const DID_ENTERS     = ['didEnter', 'enter', 'action'];
const WILL_EXITS     = ['willExit'];
const DID_EXITS      = ['didExit', 'exit'];
const DO_IFS         = ['doIf', 'guard'];
const DO_UNLESSES    = ['doUnless', 'unless'];
const FROMS          = ['from', 'fromState', 'fromStates'];
const TOS            = ['to', 'toState'];

// normalized name, definition names, toArray
const DEFMAP = {
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
    ['beforeEvent', BEFORES,     true],
    ['afterEvent',  AFTERS,      true],
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

function Definition(payload) {
  if (!(this instanceof Definition)) {
    throw new TypeError('please use the "new" operator to construct a ' +
    'Definition instance');
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

  this._payload        = copy(payload, true);
  this._statesDef      = destructDefinition(this._payload.states || {}, 'states');
  this._stateByName    = {};
  this._statesByPrefix = {};
  this._eventByName    = {};
  this._transitionsByEvent = {};
  this._transitionsByEventFromState = {};

  this.isExplicit      = false;
  this.initialState    = this._statesDef.initialState || INITIALIZED;
  this.states          = [];
  this.stateNames      = [];
  this.stateNamespaces = [];
  this.events          = [];
  this.eventNames      = [];
  this.transitions     = [];

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
  let map = DEFMAP[type];
  let def = {};
  let property;
  let aliases;
  let makeArray;
  let value;
  let i, j;

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
  let state = {
    name: name,
    willEnter: [],
    didEnter: [],
    willExit: [],
    didExit: [],
    exitTransitions: [],
    enterTransitions: []
  };

  updateState(state, payload);

  return state;
}

function updateState(state, payload) {
  let definition;
  let property;

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
  let definition = destructDefinition(payload, 'event');
  let woundTransitions = definition.transitions;
  let i;
  let event;

  event = {
    name:        name,
    beforeEvent: definition.beforeEvent,
    afterEvent:  definition.afterEvent,
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
  let def  = destructDefinition(payload, 'transition');
  let data = ownPropertiesOf(payload);
  let fromToSpecifiedByName;
  let fromToSpecifiedByKVP;

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
    'array of objects with one { fromState: "toState" } per object.');
  }

  if (fromToSpecifiedByKVP) {
    def.fromStates = [data[0]];
    def.toState    = payload[data[0]];
  }

  def.isGuarded = (def.doIf || def.doUnless) ? true : false;

  return def;
}

Definition.prototype = {
  lookupState(name) {
    let found;

    if (name === INITIAL_MACRO) {
      name = this.initialState;
    }

    if ((found = this._stateByName[name])) {
      return found;
    }

    throw new Error(`the state "${name}" is not defined, the defined states ` +
      `are: ${this.stateNames.join(', ')}`);
  },

  // Returns all states matching the given prefix
  lookupStates(prefix) {
    let found = [];
    let state = this._stateByName[prefix];
    let substates = this._statesByPrefix[prefix];
    let i;

    if (state) {
      found.push(state);
    }

    if (substates) {
      for (i = 0; i < substates.length; i++) {
        found.push(substates[i]);
      }
    }

    if (!found.length) {
      throw new Error('there are no states or substates defined matching ' +
      `the prefix: "${prefix}"`);
    }

    return found;
  },

  lookupEvent(name) {
    return this._eventByName[name];
  },

  transitionsFor(event, fromState) {
    if (fromState === INITIAL_MACRO) {
      fromState = this.initialState;
    }

    let fetch = (name, key) => {
      let found;

      if ((found = this[name][key])) {
        return found;
      } else {
        this[name][key] = [];
        return this[name][key];
      }
    }

    if (event && fromState) {
      return fetch('_transitionsByEventFromState', event + ':' + fromState);
    } else if (event) {
      return fetch('_transitionsByEvent', event);
    }

    return [];
  },

  _compileStatesDefinition() {
    this._allocateExplicitStates();
    this._applyStateDefinitions();
  },

  _allocateExplicitStates() {
    let states = this._statesDef.knownStates;
    let i;

    if (!states.length) {
      return;
    }

    this.isExplicit = true;

    if (!this._statesDef.initialState && !contains(states, this.initialState)) {
      throw new Error('an explicit list of known states was defined but it ' +
      `does not contain the default initial state "${this.initialState}", ` +
      `either change initialState or include "${this.initialState}" ` +
      'in the list of known states');
    }

    this._allocateState(this.initialState);

    for (i = 0; i < states.length; i++) {
      this._allocateState(states[i]);
    }
  },

  _applyStateDefinitions() {
    let payload = this._payload.states;
    let key;
    let stateName;

    for (key in payload) {
      if (key === INITIAL_MACRO) {
        stateName = this.initialState;
      } else {
        stateName = key;
      }

      this._updateState(stateName, payload[key]);
    }
  },

  _allocateState(name, payload) {
    let state;
    let parts;
    let subparts;
    let prefix;
    let i;

    if (state = this._stateByName[name]) {
      return state;
    }

    state = allocState(name, payload);
    parts = name.split('.');

    this.states.push(state);
    this._stateByName[name] = state;
    this.stateNames.push(name);

    if (parts.length > 1) {
      subparts = parts.slice(0, -1);

      for (i = 0; i < subparts.length; i++) {
        prefix = subparts.slice(0, i + 1).join('.');

        if (!this._statesByPrefix[prefix]) {
          this._statesByPrefix[prefix] = [];
        }

        if (this.stateNamespaces.indexOf(prefix) === -1) {
          this.stateNamespaces.push(prefix);
        }

        this._statesByPrefix[prefix].push(state);
      }
    }

    return state;
  },

  _updateState(name, payload) {
    let found;

    if ((found = this._stateByName[name])) {
      return updateState(found, payload);
    }

    if (this.isExplicit) {
      throw new Error(`${name} is not a defined state, add it to the ` +
      'list of known states');
    }

    return this._allocateState(name, payload);
  },

  _compileEventDefinitions() {
    let payload = this._payload.events;
    let eventName;

    for (eventName in payload) {
      this._compileEventDefinition(eventName, payload[eventName]);
    }

    if (!this.events.length) {
      throw new Error('no events specified, seems bad, at least one event ' +
      'must be specified to compile the state machine, COMMON!');
    }
  },

  _compileEventDefinition(name, payload) {
    let event = this._allocateEvent(name, payload);
    this.events.push(event);
    this.eventNames.push(name);
    this._eventByName[name] = event;
  },

  _allocateEvent(name, payload) {
    return allocEvent(name, payload);
  },

  _extractStatesFromTransitions() {
    let set = {};
    let implicitStates;
    let explicitState;
    let woundTransitions;
    let woundTransition;
    let fromState;
    let i, j, k;

    function addState(stateName) {
      set[stateName] = stateName;
    }

    for (i = 0; i < this.events.length; i++) {
      woundTransitions = this.events[i]._woundTransitions;

      for (j = 0; j < woundTransitions.length; j++) {
        woundTransition = woundTransitions[j];

        if (woundTransition.toState === SAME_MACRO) {
          continue;
        }

        if (woundTransition.toState === INITIAL_MACRO) {
          woundTransition.toState = this.initialState;
        }

        this._updateState(woundTransition.toState);
        addState(woundTransition.toState);

        for (k = 0; k < woundTransition.fromStates.length; k++) {
          fromState = woundTransition.fromStates[k];

          if (fromState === ALL_MACRO) {
            continue;
          }

          if (fromState === INITIAL_MACRO) {
            fromState = this.initialState;
            woundTransition.fromStates[k] = fromState;
          }

          this._updateState(fromState);
          addState(fromState);
        }
      }
    }

    implicitStates = ownPropertiesOf(set);

    if (!contains(implicitStates, this.initialState)) {
      throw new Error('initial state "' + this.initialState + '" is not ' +
      'specified in any transitions');
    }

    if (!this.isExplicit) {
      return;
    }

    for (i = 0; i < this.stateNames.length; i++) {
      explicitState = this.stateNames[i];

      if (!contains(implicitStates, explicitState)) {
        throw new Error('' + explicitState + ' state is not used in any ' +
        'transitions; it is explicitly defined to be used');
      }
    }
  },

  _unwindTransitions() {
    let woundTransitions;
    let woundTransition;
    let fromStates;
    let event;
    let eventName;
    let unwoundTransition;
    let fromState;
    let unguardedStatesSet;
    let toState;
    let key;
    let i, j, k;

    function incrUngardedState(name) {
      if (unguardedStatesSet[name] === undefined) {
        unguardedStatesSet[name] = 1;
      } else {
        unguardedStatesSet[name] += 1;
      }
    }

    for (i = 0; i < this.events.length; i++) {
      event              = this.events[i];
      eventName          = event.name;
      woundTransitions   = event._woundTransitions;
      unguardedStatesSet = {};

      for (j = 0; j < woundTransitions.length; j++) {
        woundTransition   = woundTransitions[j];
        fromStates        = woundTransition.fromStates;

        if (contains(fromStates, ALL_MACRO) || contains(fromStates, SAME_MACRO)) {
          fromStates = this.stateNames;
        }

        for (k = 0; k < fromStates.length; k++) {
          fromState = this._stateByName[fromStates[k]];
          unwoundTransition = {};

          if (!woundTransition.isGuarded) {
            incrUngardedState(fromState.name);
          }

          if (!woundTransition.isGuarded && unguardedStatesSet[fromState.name] > 1) {
            throw new Error('you specified to transition from the "' +
            fromState.name + '" state in more than one transition for the "' +
            eventName + '" event');
          }

          if (woundTransition.toState === SAME_MACRO) {
            toState = fromState;
          } else {
            toState = this._stateByName[woundTransition.toState];
          }

          for (key in woundTransition) {
            if (key === 'fromStates') {
              continue;
            }

            unwoundTransition[key] = woundTransition[key];
          }

          unwoundTransition.event     = eventName;
          unwoundTransition.fromState = fromState.name;
          unwoundTransition.toState   = toState.name;

          this.transitions.push(unwoundTransition);
          fromState.exitTransitions.push(unwoundTransition);
          toState.enterTransitions.push(unwoundTransition);
          this.transitionsFor(eventName).push(unwoundTransition);
          this.transitionsFor(eventName, fromState.name).push(unwoundTransition);
        }
      }

      delete event._woundTransitions;
    }
  },

  _compile() {
    this._compileStatesDefinition();
    this._compileEventDefinitions();
    this._extractStatesFromTransitions();
    this._unwindTransitions();
  }
};
