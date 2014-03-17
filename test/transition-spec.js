describe('FSM.Transition', function() {
  describe('init', function() {
    var t;

    beforeEach(function() {
      t = Em.FSM.Transition.create();
    });

    it('sets resolutions object', function() {
      expect(t.get('resolutions')).toEqual({});
    });

    it('sets rejections object', function() {
      expect(t.get('rejections')).toEqual({});
    });
  });

  describe('callbacksFor', function() {
    it('returns all known callbacks for given transition event type', function() {
      var fsm = createCallbackMachine({
        states: { initialState: 'okay' }
      });
      var t = fsm.transitionFor('cuddleKitty');
      var didEnterCbs = t.callbacksFor('didEnter');

      expect(fsm.get('currentState')).toBe('okay');
      expect(t.callbacksFor('willEnter').length).toBe(0);
      expect(didEnterCbs.length).toBe(2);
    });

    it('throws an error when the callbacks have not been defined on target', function() {
      expect(function() {
        var fsm = createCallbackMachine({
          states: { initialState: 'sad' }
        });
        var t = fsm.transitionFor('leaveKitty');

        t.callbacksFor('didEnter');
      }).toThrowError(/did not find callback .+ on target/);
    });
  });

  describe('callback', function() {
    var animateSmile;
    var playPurr;
    var fsm;
    var t;
    var p;

    beforeEach(function(done) {
      animateSmile = sinon.spy(function() {
        return 'i am smile very';
      });

      playPurr = sinon.spy(function() {
        return Em.RSVP.resolve('i am purr so many')
      });

      fsm = createCallbackMachine({
        states: { initialState: 'okay' },
        animateSmile: animateSmile,
        playPurr: playPurr
      });

      t = fsm.transitionFor('cuddleKitty');
      p = t.callback('didEnter');

      p.then(done);
    });

    it('merges all callbacks into one promise for the entire transition event', function() {
      expect(playPurr.calledOnce).toBe(true);
      expect(animateSmile.calledOnce).toBe(true);
    });

    it('tracks resolutions in the transition', function() {
      var resolutions = t.resolutions.didEnter;

      expect(resolutions['state:animateSmile']).toBe('i am smile very');
      expect(resolutions['transition:playPurr']).toBe('i am purr so many');
    });
  });

  describe('perform', function() {
    it('returns a promise that is resolved when all callbacks resolve', function(done) {
      var fsm;
      var t;

      fsm = createCallbackMachine({
        becameOkay: Em.K,
        stopAnimations: Em.K
      });

      t = fsm.transitionFor('wakeKitty');

      t.perform().then(function(outcome) {
        expect(outcome).toBe(t);
        done();
      });
    });

    it('returns a promise that is rejected when a callback rejects', function(done) {
      var fsm;
      var t;

      fsm = createCallbackMachine({
        becameOkay: Em.K,
        stopAnimations: function() {
          throw '~_~';
        }
      });

      t = fsm.transitionFor('wakeKitty');

      t.perform().catch(function() {
        expect(t.get('rejections').didEnter['state:stopAnimations']).toBe('~_~');
        expect(t.get('rejection')).toBe('~_~');
        done();
      });
    });
  });

  describe('isResolving', function() {
    it('is null before the transition resolves', function() {
      var fsm = createCallbackMachine();
      var t = fsm.transitionFor('wakeKitty');
      expect(t.get('isResolving')).toBe(null);
    });

    it('is false after the transition resolves', function(done) {
      var fsm = createCallbackMachine({
        becameOkay: Em.K,
        stopAnimations: Em.K
      });
      var t = fsm.transitionFor('wakeKitty');

      t.perform().then(function() {
        expect(t.get('isResolving', false))
        done();
      });
    });

    it('is true while transition resolves', function(done) {
      var promise;
      var resolver;
      var fsm;
      var t;

      promise = new Em.RSVP.Promise(function(resolve) {
        resolver = resolve;
      });

      fsm = createCallbackMachine({
        stopAnimations: Em.K,
        becameOkay: function() {
          return promise;
        }
      });

      t = fsm.transitionFor('wakeKitty');

      t.perform();

      Em.run.next(function() {
        expect(t.get('isResolving')).toBe(true);
        resolver();

        Em.run.next(function() {
          expect(t.get('isResolving')).toBe(false);
          done();
        });
      });
    });
  });

  describe('isRejected', function() {
    var fsm;
    var t;

    beforeEach(function() {
      fsm = createCallbackMachine({
        becameOkay: Em.K,
        resetFace: Em.K,
        stopAnimations: function() {
          throw 'fail';
        }
      });
      t = fsm.transitionFor('wakeKitty');
    });

    it('is null before the transition resolves', function() {
      expect(t.get('isRejected')).toBe(null);
    });

    it('is true after the transition rejects', function(done) {
      t.perform().catch(function() {
        expect(t.get('isRejected', true));
        done();
      });
    });

    it('is false if the transition resolves', function(done) {
      fsm.set('currentState', 'happy');
      t = fsm.transitionFor('cuddleKitty')

      t.perform().then(function() {
        Em.run.next(function() {
          expect(t.get('isRejected')).toBe(false);
          done();
        });
      });
    });
  });

  describe('toString', function() {
    it('returns a human-readable representation of the transition', function() {
      var fsm = createCallbackMachine();
      var t   = fsm.transitionFor('wakeKitty');
      expect(t.toString()).toBe(
        'Transition {\n' +
        '  event: wakeKitty,\n' +
        '  eventArgs: undefined,\n' +
        '  fromState: sleeping,\n' +
        '  toState: okay,\n' +
        '  isResolved: true,\n' +
        '  isRejected: null\n' +
        '}'
      );
    });
  });
});
