define("ember-fsm/machine-definition",
  ["./utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var propertiesOf = __dependency1__.propertiesOf;
    var getFirst = __dependency1__.getFirst;
    var toArray = __dependency1__.toArray;

    __exports__["default"] = MachineDefinition;

    var ALL_MACRO      = '$all';
    var SAME_MACRO     = '$same';
    var INITIALIZED    = 'initialized';
    var TRANSITIONS    = ['transition', 'transitions'];
    var INITIAL_STATES = ['initialState'];
    var EXPLICITS      = ['explicitStates', 'knownStates'];
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
        ['initialState',   INITIAL_STATES, false],
        ['explicitStates', EXPLICITS,      true]
      ],

      state: [
        ['willEnter', WILL_ENTERS, true],
        ['didEnter',  DID_ENTERS,  true],
        ['willExit',  WILL_EXITS,  true],
        ['didExit',   DID_EXITS,   true]
      ]
    };

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
    // definition => { initialState: 'ready', explicitStates: ['ready'] }
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
          payload[aliases[j]] = undefined;

          if (value !== undefined) {
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
      var definition = destructDefinition(payload, 'state');
      var property;

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
      var transition;

      for (i = 0; i < transitions.length; i++) {
        event.transitions.push(allocEventTransition(event, transitions[i]));
      }

      return event;
    }

    function allocEventTransition(event, payload) {
      var def  = destructDefinition(payload, 'transition');
      var data = propertiesOf(payload);
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

      def.event = event;

      return def;
    }

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
      this.events       = [];
      this.transitions  = [];

      this._compile();
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
        var states = this._stateConf.explicitStates;
        var i;
        var stateName;

        if (!states) {
          return;
        }

        this.isExplicit = true;

        for (i = 0; i < states.length; i++) {
          stateName = states[i];
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

        if (this._lookupState(name)) {
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

        for (eventName in payload) {
          this._compileEvent(eventName, payload[eventName]);
        }
      },

      _compileEvent: function(name, payload) {
        var event = this._allocEvent(name, payload);

      },

      _allocEvent: function(name, payload) {
        var definition = allocEvent(name, payload)
        this.events.push(definition);
        this._eventsByName[name] = definition;
        return definition;
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
  });define("ember-fsm/machine",
  ["ember","./utils","./transition","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"] || __dependency1__;
    var required = __dependency1__.required;
    var computed = __dependency1__.computed;
    var typeOf = __dependency1__.typeOf;
    var inspect = __dependency1__.inspect;
    var capitalCamelize = __dependency2__.capitalCamelize;
    var Transition = __dependency3__["default"] || __dependency3__;

    var STATE_MACROS;
    var ALL_MACRO;
    var INITIAL_MACRO;

    STATE_MACROS = [
      ALL_MACRO     = '$all',
      INITIAL_MACRO = '$initial'
    ];

    __exports__["default"] = Ember.Object.extend({
      initialState:      'initialized',
      isTransitioning:   computed.bool('activeTransitions.length'),
      stateEvents:       null,
      activeTransitions: null,
      currentState:      null,

      target: computed(function(key, value) {
        return arguments.length === 1 ? this : value;
      }),

      init: function() {
        this._transitions_ = {};
        if (!this.get('stateEvents')) {
          throw new Ember.Error(
            'No stateEvents were specified, a state machine can not function ' +
            'without state, COMMON.'
          );
        }
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
  });define("ember-fsm",
  ["./machine-definition","./machine","./transition","./stateful","./reject","./utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __exports__) {
    "use strict";
    /*!
    ember-fsm
    (c) 2014 Carsten Nielsen
    - License: https://github.com/heycarsten/ember-fsm/blob/master/LICENSE
    */

    var MachineDefinition = __dependency1__["default"] || __dependency1__;
    var Machine = __dependency2__["default"] || __dependency2__;
    var Transition = __dependency3__["default"] || __dependency3__;
    var Stateful = __dependency4__["default"] || __dependency4__;
    var reject = __dependency5__.reject;
    var utils = __dependency6__["default"] || __dependency6__;

    __exports__.MachineDefinition = MachineDefinition;
    __exports__.Machine = Machine;
    __exports__.Transition = Transition;
    __exports__.Stateful = Stateful;
    __exports__.reject = reject;
    __exports__.utils = utils;
  });define("ember-fsm/reject",
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"] || __dependency1__;

    function reject() {
      throw new Ember.Error('rejected transition');
    }

    __exports__.reject = reject;
  });define("ember-fsm/stateful",
  ["ember","./machine","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Mixin = __dependency1__.Mixin;
    var required = __dependency1__.required;
    var computed = __dependency1__.computed;
    var Machine = __dependency2__["default"] || __dependency2__;

    __exports__["default"] = Mixin.create({
      initialState: undefined,
      stateEvents:  required(),
      isLoading:    computed.oneWay('fsm.isTransitioning'),
      currentState: computed.oneWay('fsm.currentState'),

      init: function() {
        var initialState;
        var params = {};
        var boolAccesorsMixin = {};

        params.stateEvents = this.get('stateEvents');
        params.target      = this;

        if ((initialState = this.get('initialState'))) {
          params.initialState = initialState;
        }

        this.set('fsm', Machine.create(params));

        this.get('fsm')._booleanStateAccessors_.forEach(function(accessor) {
          boolAccesorsMixin[accessor] = computed.oneWay('fsm.' + accessor);
        });

        this.reopen(boolAccesorsMixin);

        this._super();
      },

      sendStateEvent: function() {
        var fsm = this.get('fsm');
        return fsm.send.apply(fsm, arguments);
      }
    });
  });define("ember-fsm/transition",
  ["ember","ember/rsvp","./utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"] || __dependency1__;
    var RSVP = __dependency2__["default"] || __dependency2__;
    var computed = __dependency1__.computed;
    var inspect = __dependency1__.inspect;
    var Promise = __dependency2__.Promise;
    var withPromise = __dependency3__.withPromise;
    var toArray = __dependency3__.toArray;

    var CALLBACKS = [
      ['beforeEvent',    'event'],
      ['willExitState',  'fromState'],
      ['willEnterState', 'toState'],
      ['_setNewState_'],
      ['didExitState',   'fromState'],
      ['didEnterState',  'toState'],
      ['afterEvent',     'event']
    ];

    __exports__["default"] = Ember.Object.extend({
      fsm:           null,
      fromState:     null,
      toState:       null,
      event:         null,
      eventArgs:     null,
      userCallbacks: null,
      target:        computed.oneWay('fsm.target'),
      currentState:  computed.alias('fsm.currentState'),
      isResolving:   null,
      isResolved:    computed.not('isResolving'),
      isRejected:    null,

      init: function() {
        this.set('resolutions', {});
        this.set('rejections',  {});
      },

      perform: function() {
        var transition = this;
        var promise;

        promise = new Promise(function(resolve, reject) {
          var currentCallbackIndex = 0;

          function settleNext() {
            var cb = CALLBACKS[currentCallbackIndex++];

            if (!cb) {
              resolve(transition);
            } else {
              transition.callback(cb[0], cb[1]).then(settleNext, reject);
            }
          }

          settleNext();
        });

        this.set('isResolving', true);

        promise.catch(function() {
          transition.set('isRejected', true);
        });

        promise.finally(function() {
          transition.set('isResolving', false);
        });

        return promise;
      },

      userCallbacksFor: function(name) {
        var target    = this.get('target');
        var userValue = this.get('userCallbacks')[name];
        var callbacks = [];

        if (!userValue) {
          return [];
        }

        toArray(userValue).forEach(function(userDefinedName) {
          var userCallbacks = this.callbacksFor(userDefinedName);

          if (!userCallbacks.length) {
            throw new Ember.Error(
              'undefined callback ' + inspect(userDefinedName) + ' on ' +
              'target ' + inspect(target) + ' for transition:\n\n' +
              this
            );
          }

          userCallbacks.forEach(function(cb) {
            callbacks.push(cb);
          });
        }, this);

        return callbacks;
      },

      callbacksFor: function(name) {
        var callbacks = [];
        var fsm    = this.get('fsm');
        var target = this.get('target');
        var fn;

        if ((fn = fsm[name])) {
          callbacks.push([fsm, fn, 'fsm:' + name]);
        }

        if ((fn = target[name]) && fsm !== target) {
          callbacks.push([target, fn, name]);
        }

        return callbacks;
      },

      callback: function(name, arg0Property) {
        var arg0             = arg0Property ? this.get(arg0Property) : null;
        var promises         = {};
        var eventArgs        = this.get('eventArgs');
        var userCallbacks    = this.userCallbacksFor(name);
        var builtinCallbacks = this.callbacksFor(name);
        var transition       = this;
        var promise;

        function pushPromises(callbacks, argsTwerker) {
          var args = eventArgs.slice(0);

          argsTwerker(args);

          callbacks.forEach(function(cb) {
            var target = cb[0];
            var fn     = cb[1];

            promises[cb[2]] = withPromise(function() {
              return fn.apply(target, args);
            });
          });
        }

        pushPromises(builtinCallbacks, function(args) {
          args.insertAt(0, transition);

          if (arg0) {
            args.insertAt(0, arg0);
          }
        });

        pushPromises(userCallbacks, function(args) {
          if (arg0) {
            args.push(arg0);
          }

          args.push(transition);
        });

        promise = RSVP.hash(promises);

        promise.then(function(results) {
          delete results._setNewState_;

          transition.get('resolutions')[name] = results;
        });

        promise.catch(function(error) {
          transition.get('rejections')[name] = error;
        });

        return promise;
      },

      toString: function() {
        return (
          'Transition {' +
          '  event:      ' + this.get('event') + ',\n' +
          '  eventArgs:  ' + inspect(this.get('eventArgs')) + ',\n' +
          '  fromState:  ' + inspect(this.get('fromState')) + ',\n' +
          '  toState:    ' + inspect(this.get('toState')) + ',\n' +
          '  isResolved: ' + this.get('isResolved') + ',\n' +
          '  isRejected: ' + this.get('isRejected') + '\n' +
          '}'
        );
      }
    });
  });define("ember-fsm/utils",
  ["ember/string","ember/rsvp","ember","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var capitalize = __dependency1__.capitalize;
    var camelize = __dependency1__.camelize;
    var Promise = __dependency2__.Promise;
    var typeOf = __dependency3__.typeOf;
    var get = __dependency3__.get;

    function isThenable(thing) {
      var thingType = typeOf(thing);

      if (thingType === 'object' || thingType === 'instance') {
        return typeOf(get(thing, 'then')) === 'function';
      } else {
        return false;
      }
    }

    __exports__.isThenable = isThenable;// Takes a function, calls it, then wraps the result in a promise if it's not
    // already a promise. If the function throws an error it is caught and called as
    // the rejector of the created promise.
    function withPromise(block) {
      var response;
      var exception;

      try {
        response = block();
      } catch(e) {
        exception = e;
      }

      if (isThenable(response)) {
        return response;
      } else {
        return new Promise(function(resolve, reject) {
          if (exception) {
            reject(exception);
          } else {
            resolve(response);
          }
        });
      }
    }

    __exports__.withPromise = withPromise;function capitalCamelize(str) {
      return capitalize(camelize(str));
    }

    __exports__.capitalCamelize = capitalCamelize;function toArray(thing) {
      if (thing === undefined) {
        return [];
      }

      return typeOf(thing) === 'array' ? thing : [thing];
    }

    __exports__.toArray = toArray;function propertiesOf(object) {
      var properties = [];
      var property;

      if (!isObject(object)) {
        throw new TypeError('can\'t determine properties of: ' + object);
      }

      for (property in object) {
        if (object.hasOwnProperty(property) && object[property] !== undefined) {
          properties.push(property);
        }
      }

      return properties;
    }

    __exports__.propertiesOf = propertiesOf;function isObject(obj) {
      var type = typeOf(obj);
      return type === 'class' || type === 'instance' || type === 'object';
    }

    __exports__.isObject = isObject;function getFirst(obj, properties) {
      var value;
      var i;

      properties = toArray(properties);

      if (!isObject(obj)) {
        return value;
      }

      for (i = 0; i < properties.length; i++) {
        value = obj[properties[i]];

        if (value !== undefined) {
          break;
        }
      }

      return value;
    }

    __exports__.getFirst = getFirst;
  });