function createMachine(params, ext) {
  $.extend(true, params, ext);
  return Em.FSM.Machine.create(params);
}

function createBasicMachine(opts) {
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

function createCallbackMachine(opts) {
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
        transitions: [
          { sad: 'happy' },
          { happy: '$same' },
          { okay: 'happy', didEnter: 'playPurr' }
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

    playPurr: function() {
      return 'i am purring so much';
    },

    animateSmile: function() {
      return Em.RSVP.resolve('i am smiling so much');
    }
  }, opts);
}
