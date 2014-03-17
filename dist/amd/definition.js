define(
  ["./utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ownPropertiesOf = __dependency1__.ownPropertiesOf;
    var toArray = __dependency1__.toArray;

    __exports__["default"] = Definition;

    var ALL_MACRO      = '$all';
    var SAME_MACRO     = '$same';
    var INITIAL_MACRO  = '$initial';
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

      this._payload = payload;
      this._statesDef = destructDefinition(payload.states || {}, 'states');
      this._stateByName = {};
      this._statesByPrefix = {};
      this._eventByName = {};
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

    Definition.prototype = {
      lookupState: function(name) {
        var found;

        if (name === INITIAL_MACRO) {
          name = this.initialState;
        }

        if ((found = this._stateByName[name])) {
          return found;
        }

        throw new Error('the state "' + name + '" is not defined, the defined ' +
        'states are: ' + this.stateNames.join(', '));
      },

      // Returns all states matching the given prefix
      lookupStates: function(prefix) {
        var found = [];
        var state = this._stateByName[prefix];
        var substates = this._statesByPrefix[prefix];
        var i;

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
          'the prefix: "' + prefix + '"');
        }

        return found;
      },

      lookupEvent: function(name) {
        return this._eventByName[name];
      },

      transitionsFor: function(event, fromState) {
        var _this = this;

        if (fromState === INITIAL_MACRO) {
          fromState = this.initialState;
        }

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
          return fetch('_transitionsByEventFromState', event + ':' + fromState);
        } else if (event) {
          return fetch('_transitionsByEvent', event);
        }

        return [];
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
        var key;
        var stateName;

        for (key in payload) {
          if (key === INITIAL_MACRO) {
            stateName = this.initialState;
          } else {
            stateName = key;
          }

          this._updateState(stateName, payload[key]);
        }
      },

      _allocateState: function(name, payload) {
        var state;
        var parts;
        var subparts;
        var prefix;
        var i;

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

      _updateState: function(name, payload) {
        var found;

        if ((found = this._stateByName[name])) {
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
        var event = this._allocateEvent(name, payload);
        this.events.push(event);
        this.eventNames.push(name);
        this._eventByName[name] = event;
      },

      _allocateEvent: function(name, payload) {
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

            if (fromStates.contains(ALL_MACRO) || fromStates.contains(SAME_MACRO)) {
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

      _compile: function() {
        this._compileStatesDefinition();
        this._compileEventDefinitions();
        this._extractStatesFromTransitions();
        this._unwindTransitions();
      }
    };
  });