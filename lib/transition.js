import Ember from 'ember';
import RSVP from 'ember/rsvp';
import { computed, inspect, get } from 'ember';
import { Promise } from 'ember/rsvp';
import { withPromise } from './utils';

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
  didEnter: 'toState'
};

export default Ember.Object.extend({
  target:        null,
  machine:       null,
  fromState:     null,
  toState:       null,
  event:         null,
  eventArgs:     null,
  beforeEvent:   null,
  willEnter:     null,
  didEnter:      null,
  willExit:      null,
  didExit:       null,
  afterEvent:    null,
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
    var callbackName;
    var callbackFn;
    var i;
    var j;

    function fetchCallback(name) {
      var found;

      if (found = get(target, name)) {
        return found;
      }

      throw new Error('did not find callback "' + name + '" on target: ' +
      target);
    }

    if ((extSource = EXT_CALLBACK_SOURCES[transitionEvent])) {
      sources.push(def.lookupState(this.get(extSource)));
    }

    for (i = 0; i < sources.length; i++) {
      source = sources[i];
      sourceCallbackNames = (source[transitionEvent] || []);

      for (j = 0; j < sourceCallbackNames.length; j++) {
        callbackName = sourceCallbackNames[j];
        callbackFn   = fetchCallback(callbackName);

        callbacks.push({
          via: source === this ? 'transition' : 'state',
          name: callbackName,
          fn: callbackFn
        });
      }
    }

    return callbacks;
  },

  callback: function(name) {
    var transition = this;
    var target     = this.get('target');
    var promises   = {};
    var promise;
    var callbacks;
    var cb;
    var i;

    function promiseCallback(fn) {
      return withPromise(function() {
        return fn.call(target, transition);
      });
    }

    // Shortcut internal callbacks
    if (name[0] === '_') {
      return RSVP.resolve(this.get('machine')[name](this));
    }

    callbacks = this.callbacksFor(name);

    for (i = 0; i < callbacks.length; i++) {
      cb = callbacks[i];
      promises[cb.via + ':' + cb.name] = promiseCallback(cb.fn);
    }

    promise = RSVP.hash(promises);

    promise.then(function(results) {
      transition.get('resolutions')[name] = results;
    });

    promise.catch(function(error) {
      transition.set('rejection', error);
      transition.get('rejections')[name] = error;
    });

    return promise;
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
