"use strict";
var Ember = require("ember")["default"] || require("ember");
var RSVP = require("ember/rsvp")["default"] || require("ember/rsvp");
var computed = require("ember").computed;
var inspect = require("ember").inspect;
var get = require("ember").get;
var Promise = require("ember/rsvp").Promise;
var withPromise = require("./utils").withPromise;

var CALLBACKS = [
  'beforeEvent',
  'willExit',
  'willEnter',
  '_setNewState_',
  'didExit',
  'didEnter',
  'afterEvent'
];

var EXT_CALLBACK_SOURCES = {
  willExit: 'fromState',
  didExit: 'fromState',
  willEnter: 'toState',
  didEnter: 'toState',
  beforeEvent: 'event',
  afterEvent: 'event'
};

exports["default"] = Ember.Object.extend({
  target:      null,
  machine:     null,
  fromState:   null,
  toState:     null,
  event:       null,
  eventArgs:   null,
  beforeEvent: null,
  willEnter:   null,
  didEnter:    null,
  willExit:    null,
  didExit:     null,
  afterEvent:  null,
  isAborted:   null,
  isResolving: null,
  isResolved:  computed.not('isResolving'),
  isRejected:  null,

  init: function() {
    this.set('resolutions', {});
    this.set('rejections',  {});
  },

  abort: function() {
    this.set('isAborted', true);
  },

  perform: function() {
    var transition = this;
    var promise;

    promise = new Promise(function(resolve, reject) {
      var currentCallbackIndex = 0;

      function next() {
        var cb = CALLBACKS[currentCallbackIndex++];

        if (!cb) {
          resolve(transition);
        } else {
          transition.callback(cb).then(next, reject);
        }
      }

      next();
    });

    this.set('isResolving', true);

    promise.then(function() {
      transition.set('isRejected', false);
    });

    promise.catch(function() {
      transition.set('isRejected', true);
    });

    promise.finally(function() {
      transition.set('isResolving', false);
    });

    return promise;
  },

  callbacksFor: function(transitionEvent) {
    var callbacks = [];
    var machine   = this.get('machine');
    var def       = machine.definition;
    var target    = this.get('target');
    var sources   = [this];
    var sourceCallbackNames;
    var extSource;
    var source;
    var callbackVia;
    var callbackName;
    var callbackFn;
    var i;
    var j;

    function fetchCallback(name) {
      var fn = get(target, name);

      if (!fn) {
        throw new Error('did not find callback "' + name + '" on target: ' +
        target);
      }

      return function() {
        return fn.apply(target, arguments);
      };
    }

    if ((extSource = EXT_CALLBACK_SOURCES[transitionEvent])) {
      if (extSource === 'event') {
        sources.push(def.lookupEvent(this.get(extSource)));
      } else {
        sources.push(def.lookupState(this.get(extSource)));
      }
    }

    for (i = 0; i < sources.length; i++) {
      source = sources[i];
      sourceCallbackNames = (source[transitionEvent] || []);

      for (j = 0; j < sourceCallbackNames.length; j++) {
        callbackName = sourceCallbackNames[j];
        callbackFn   = fetchCallback(callbackName);
        callbackVia  = source === this ? 'transition' : 'state';

        callbacks.push({
          via:  callbackVia,
          name: callbackName,
          fn:   callbackFn,
          key:  (callbackVia + ':' + callbackName)
        });
      }
    }

    return callbacks;
  },

  callback: function(name) {
    var transition = this;
    var promises   = {};
    var callbacks;
    var callback;
    var promise;
    var i;

    function promiseCallback(fn) {
      return withPromise(function() {
        if (transition.get('isAborted')) {
          return 'aborted';
        } else {
          return fn(transition);
        }
      });
    }

    function callbackPromiseResolver(cb) {
      return function(result) {
        var resolutions = transition.get('resolutions');

        if (!resolutions[name]) {
          resolutions[name] = {};
        }

        resolutions[name][cb.key] = result;
      };
    }

    function callbackPromiseRejector(cb) {
      return function(error) {
        var rejections = transition.get('rejections');

        if (!rejections[name]) {
          rejections[name] = {};
        }

        rejections[name][cb.key] = error;

        transition.set('rejection', error);
      };
    }

    // Shortcut internal callbacks
    if (name[0] === '_') {
      return RSVP.resolve(this.get('machine')[name](this));
    }

    callbacks = this.callbacksFor(name);

    for (i = 0; i < callbacks.length; i++) {
      callback = callbacks[i];
      promise  = promiseCallback(callback.fn);

      promise.then(
        callbackPromiseResolver(callback),
        callbackPromiseRejector(callback)
      );

      promises[callback.key] = promise;
    }

    return RSVP.hash(promises);
  },

  toString: function() {
    return (
      'Transition {\n' +
      '  event: ' + this.get('event') + ',\n' +
      '  eventArgs: ' + inspect(this.get('eventArgs')) + ',\n' +
      '  fromState: ' + inspect(this.get('fromState')) + ',\n' +
      '  toState: ' + inspect(this.get('toState')) + ',\n' +
      '  isResolved: ' + this.get('isResolved') + ',\n' +
      '  isRejected: ' + this.get('isRejected') + '\n' +
      '}'
    );
  }
});