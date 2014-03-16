describe('FSM.Transition', function() {
  function fetchTransition(event, state) {
    var fsm = Ember.FSM.Machine.create({
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
        return 'i am animating a smile so much';
      }
    });

    if (state) {
      fsm.set('currentState', state);
    }

    return fsm.transitionFor(event, state);
  }

  describe('callbacksFor', function() {
    it('returns all known callbacks for given transition event type', function() {
      var t = fetchTransition('cuddleKitty', 'okay');
      var fsm = t.get('machine');

      expect(t.callbacksFor('willEnter').length).toBe(0);
      expect(t.callbacksFor('didEnter').length).toBe(2);
      expect(t.callbacksFor('didEnter')).toContain(
        fsm.get('playPurr'), fsm.get('animateSmile')
      );
    });

    it('throws an error when the callbacks have not been defined on target', function() {
      expect(function() {
        fetchTransition('leaveKitty', 'sad').callbacksFor('didEnter');
      }).toThrowError(/did not find callback .+ on target/);
    });
  });
});
