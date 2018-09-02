import { not } from '@ember/object/computed';
import { hash, resolve, Promise } from 'rsvp';
import EmberObject, { get } from '@ember/object';
import { typeOf } from '@ember/utils';
import { assert, inspect } from '@ember/debug';
import { withPromise, bind } from './utils';

const CALLBACKS = [
  'beforeEvent',
  '_activateTransition_',
  'willExit',
  'willEnter',
  '_setNewState_',
  'didExit',
  'didEnter',
  '_deactivateTransition_',
  'afterEvent'
];

const EXT_CALLBACK_SOURCES = {
  willExit: 'fromState',
  didExit: 'fromState',
  willEnter: 'toState',
  didEnter: 'toState',
  beforeEvent: 'event',
  afterEvent: 'event'
};

export default EmberObject.extend({
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
  isResolved:  not('isResolving'),
  isRejected:  null,

  init() {
    this.set('resolutions', {});
    this.set('rejections',  {});
  },

  abort() {
    this.set('isAborted', true);
  },

  perform() {
    let promise = new Promise((resolve, reject) => {
      let currentCallbackIndex = 0;

      let next = () => {
        let cb = CALLBACKS[currentCallbackIndex++];

        if (!cb) {
          resolve(this);
        } else {
          this.callback(cb).then(next, reject);
        }
      };

      next();
    });

    this.set('isResolving', true);

    promise.then(() => {
      this.set('isRejected', false);
    });

    promise.catch(() => {
      this.set('isRejected', true);
    });

    promise.finally(() => {
      this.set('isResolving', false);
    });

    return promise;
  },

  callbacksFor(transitionEvent) {
    let callbacks = [];
    let machine   = this.get('machine');
    let def       = machine.definition;
    let target    = this.get('target');
    let sources   = [this];
    let sourceCallbackNames;
    let extSource;
    let source;
    let callbackVia;
    let callbackName;
    let callbackFn;
    let i;
    let j;

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

        if (typeOf(callbackName) === 'function') {
          callbackFn   = callbackName;
          callbackName = '_inline:' + i + '-' + j + '_';
        } else {
          callbackFn = get(target, callbackName);
          assert(`Callback "${name}" on target ${target} should be a function, but is a ${typeOf(callbackFn)}`, typeOf(callbackFn) === 'function');
        }

        callbackVia = source === this ? 'transition' : 'state';

        callbacks.push({
          via:  callbackVia,
          name: callbackName,
          fn:   bind(target, callbackFn),
          key:  (callbackVia + ':' + callbackName)
        });
      }
    }

    return callbacks;
  },

  callback(name) {
    let promises = {};
    let callbacks;
    let callback;
    let promise;
    let i;

    let promiseCallback = (fn) => {
      return withPromise(() => {
        if (this.get('isAborted')) {
          return 'aborted';
        } else {
          return fn(this);
        }
      });
    };

    let callbackPromiseResolver = (cb) => {
      return (result) => {
        let resolutions = this.get('resolutions');

        if (!resolutions[name]) {
          resolutions[name] = {};
        }

        resolutions[name][cb.key] = result;
      };
    };

    let callbackPromiseRejector = (cb) => {
      return (error) => {
        let rejections = this.get('rejections');

        if (!rejections[name]) {
          rejections[name] = {};
        }

        rejections[name][cb.key] = error;

        this.set('rejection', error);
      };
    };

    // Shortcut internal callbacks
    if (name[0] === '_') {
      return resolve(this.get('machine')[name](this));
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

    return hash(promises);
  },

  toString() {
    return (
      'Transition {\n' +
      `  event: ${this.get('event')},\n` +
      `  eventArgs: ${inspect(this.get('eventArgs'))},\n` +
      `  fromState: ${inspect(this.get('fromState'))},\n` +
      `  toState: ${inspect(this.get('toState'))},\n` +
      `  isResolved: ${this.get('isResolved')},\n` +
      `  isRejected: ${this.get('isRejected')}\n` +
      '}'
    );
  }
});
