import { resolve } from 'rsvp';
import { assign } from '@ember/polyfills';
import { Machine } from 'ember-fsm';

// https://stackoverflow.com/questions/38345937/object-assign-vs-extend
function isObject(item) {
  return (item && (typeof item === 'object') && !Array.isArray(item));
}

function deepMerge(target, ...sources) {
  if (!sources.length) {
    return target;
  }

  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
          assign(target, { [key]: {} });
        }
        deepMerge(target[key], source[key]);
      } else {
        assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

export function createMachine(params, ext) {
  deepMerge(params, ext);
  return Machine.create(params);
}

export function createBasicMachine(opts) {
  return createMachine({
    states: {
      initialState: 'inactive'
    },

    events: {
      run: {
        transitions: { $all: 'active.running' }
      },

      walk: {
        transitions: { $all: 'active.walking' }
      },

      trip: {
        transitions: [
          { 'active.running': 'injured', doIf: 'atMaxSpeed' },
          { 'active.running': 'inactive' }
        ]
      },

      reset: {
        transition: { $all: 'inactive' }
      },

      slowDown: {
        transitions: [
          { 'active.running': 'active.walking' },
          { 'active.walking': 'inactive' },
          { inactive:         '$same' }
        ]
      }
    },

    atMaxSpeed: false
  }, opts);
}

export function createCallbackMachine(opts) {
  return createMachine({
    states: {
      initialState: 'sleeping',

      happy: {
        didEnter: 'animateSmile',
        didExit: 'resetFace'
      },

      sad: {
        didEnter: 'animateFrown',
        didExit: 'resetFace'
      },

      okay: {
        didEnter: ['becameOkay', 'stopAnimations']
      }
    },

    events: {
      cuddleKitty: {
        before: 'beforeCuddle',
        after: 'afterCuddle',

        transitions: [
          { sad: 'happy' },
          { happy: '$same' },
          { okay: 'happy', didEnter: 'playPurr',
            before: 'beforeCuddleFromOkayToHappy',
            after: 'afterCuddleFromOkayToHappy' }
        ]
      },

      leaveKitty: {
        transitions: [
          { sad: '$same', didEnter: 'playCry' },
          { happy: 'okay' },
          { okay: 'sad' }
        ]
      },

      returnToKitty: {
        transitions: { $all: 'happy' }
      },

      wakeKitty: {
        transitions: { sleeping: 'okay' }
      }
    },

    beforeCuddle() { return this; },
    afterCuddle() { return this; },
    beforeCuddleFromOkayToHappy() { return this; },
    afterCuddleFromOkayToHappy() { return this; },

    playPurr() {
      return 'i am purring so much';
    },

    animateSmile() {
      return resolve('i am smiling so much');
    }
  }, opts);
}