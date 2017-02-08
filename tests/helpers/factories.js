import { Machine } from 'ember-fsm';
import Ember from 'ember';

export function createMachine(params, ext) {
  Ember.$.extend(true, params, ext);
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
      return Ember.RSVP.resolve('i am smiling so much');
    }
  }, opts);
}