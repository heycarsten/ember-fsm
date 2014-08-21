describe('FSM.Machine', function() {
  describe('create', function() {
    it('adds a default error event and finished state if none is provided', function() {
      var fsm = createMachine({
        events: {
          one: { transitions: { initialized: 'a' } }
        }
      });

      expect(fsm.get('stateNames')).toContain('failed');
      expect(fsm.get('eventNames')).toContain('error');
    });

    it('does not add default error event if one is provided by the user', function() {
      var fsm = createMachine({
        events: {
          one: { transition: { initialized: 'a' } },
          error: { transition: { a: 'broken' } }
        }
      });

      expect(fsm.get('stateNames')).not.toContain('failed');
    });

    it('sets the currentState to the initialState', function() {
      var fsm = createMachine({
        states: { initialState: 'ready' },
        events: { one: { transition: { ready: 'a' } } }
      });

      expect(fsm.get('currentState')).toBe('ready');
    });

    it('sets the currentState to the overruled initialState', function() {
      var fsm = createMachine({
        initialState: 'done',
        states: {
          initialState: 'ready',
        },
        events: {
          one: { transition: { ready: 'a' } },
          two: { transition: { done: 'b' } },
        }
      });

      expect(fsm.get('currentState')).toBe('done');
    });

    it('does not destruct original definition', function() {
      var FSM;
      var fsm0;
      var fsm1;

      FSM = Em.FSM.Machine.extend({
        states: { initialState: 'one' },
        events: {
          next: { transition: { one: 'two' } }
        }
      });

      fsm0 = FSM.create();
      expect(fsm0.get('currentState')).toBe('one');

      fsm1 = FSM.create();
      expect(fsm1.get('currentState')).toBe('one');
    });
  });

  describe('transitionFor', function() {
    it('selects a transition based off the current state', function() {
      var fsm = createBasicMachine();
      var t   = fsm.transitionFor('run');

      expect(t.constructor).toBe(Ember.FSM.Transition);
      expect(t.toState).toBe('active.running');
    });

    it('considers guards when selecting a transition', function() {
      var fsm = createBasicMachine({
        states: {
          initialState: 'active.running'
        },
        atMaxSpeed: true
      });

      expect(fsm.get('currentState')).toBe('active.running');
      expect(fsm.transitionFor('trip').toState).toBe('injured');

      fsm.set('atMaxSpeed', false);

      expect(fsm.transitionFor('trip').toState).toBe('inactive');
    });
  });

  describe('inState', function() {
    it('throws an error if the passed state name does not exist', function() {
      var fsm = createBasicMachine();

      expect(function() {
        fsm.inState('herp');
      }).toThrowError(/no states or substates/);
    });

    it('returns true for namespace match', function() {
      var fsm = createBasicMachine({
        states: { initialState: 'active.running' }
      });

      expect(fsm.get('currentState')).toBe('active.running');
      expect(fsm.inState('active')).toBe(true);
      expect(fsm.inState('active.running')).toBe(true);
      expect(fsm.inState('inactive')).toBe(false);
    });

    it('returns true for a state match', function() {
      var fsm = createBasicMachine();
      expect(fsm.inState('inactive')).toBe(true);
    });
  });

  describe('isIn{{stateName}} accessors', function() {
    it('returns true if it matches the current state', function() {
      var fsm = createBasicMachine();

      expect(fsm.get('currentState')).toBe('inactive');
      expect(fsm.get('isInInactive')).toBe(true);
      expect(fsm.get('isInActiveRunning')).toBe(false);
    });

    it('returns true if it matches the current state namespace', function() {
      var fsm = createBasicMachine();

      fsm.set('currentState', 'active.running');

      expect(fsm.get('currentState')).toBe('active.running');
      expect(fsm.get('isInActive')).toBe(true);
      expect(fsm.get('isInActiveRunning')).toBe(true);
      expect(fsm.get('isInInactive')).toBe(false);
    });

    it('is invalidated when the current state changes', function() {
      var fsm = createBasicMachine();
      expect(fsm.get('isInInactive')).toBe(true);

      fsm.set('currentState', 'active.running');
      expect(fsm.get('isInInactive')).toBe(false);

      fsm.set('currentState', 'inactive');
      expect(fsm.get('isInInactive')).toBe(true);
    });
  });

  describe('canEnterState', function() {
    it('returns true if the requested state can be entered from the current state on any event', function() {
      var fsm = createBasicMachine();

      expect(fsm.get('currentState')).toBe('inactive');

      expect(fsm.canEnterState('active.running')).toBe(true);
      expect(fsm.canEnterState('injured')).toBe(false);

      fsm.set('currentState', 'active.running');
      fsm.set('atMaxSpeed', true);

      expect(fsm.canEnterState('injured')).toBe(true);
    });
  });

  describe('send', function() {
    var makeSmoke;
    var stopSmoke;
    var startedUp;
    var shutDown;
    var throwError;
    var goneBrokeDownResult;
    var increaseWorkload;
    var target;
    var fsm;

    beforeEach(function() {
      makeSmoke = sinon.spy(function() {
        return 'blerp smoke';
      });

      stopSmoke = sinon.spy(function() {
        return 'i yelling';
      });

      startedUp = sinon.spy(function() {
        return 'started up';
      });

      shutDown = sinon.spy(function() {
        return Em.RSVP.resolve('shut down');
      });

      throwError = sinon.spy(function() {
        return Em.RSVP.reject('exploded');
      });

      increaseWorkload = sinon.spy(function() {
        throw 'overheated';
      });

      target = Em.Object.create({
        makeSmoke: makeSmoke,
        stopSmoke: stopSmoke,
        startedUp: startedUp,
        shutDown: shutDown,
        throwError: throwError,
        increaseWorkload: increaseWorkload,
        goneBrokeDown: function(transition) {
          goneBrokeDownResult = transition;
        }
      });

      fsm = createMachine({
        target: target,

        states: {
          initialState: 'stopped',

          running: {
            didEnter: 'makeSmoke'
          },

          stopped: {
            didEnter: 'stopSmoke'
          },

          failed: {
            didEnter: 'goneBrokeDown'
          }
        },

        events: {
          start: {
            transition: { stopped: 'running', after: 'startedUp' }
          },

          stop: {
            transition: { running: 'stopped', after: 'shutDown' }
          },

          doMore: {
            transition: {
              running: '$same', action: 'increaseWorkload'
            }
          },

          explode: {
            transition: { running: 'stopped', before: 'throwError' }
          }
        }
      });
    });

    it('runs the transition and all related callbacks', function(done) {
      expect(fsm.get('currentState')).toBe('stopped');

      fsm.send('start').then(function() {
        var c0 = startedUp.getCall(0);
        var a0 = c0.args[0];

        var c1 = makeSmoke.getCall(0);
        var a1 = c1.args[0];

        expect(fsm.get('currentState')).toBe('running');

        expect(startedUp.calledOnce).toBe(true);
        expect(makeSmoke.calledOnce).toBe(true);

        expect(c0.args.length).toBe(1);
        expect(c1.args.length).toBe(1);

        expect(a0.constructor).toBe(Em.FSM.Transition);
        expect(a1.constructor).toBe(Em.FSM.Transition);

        expect(a0.get('fromState')).toBe('stopped');
        expect(a0.get('toState')).toBe('running');

        done();
      });
    });

    it('captures results in the transition', function(done) {
      fsm.send('start').then(function(t) {
        var resolutions;

        expect(t.constructor).toBe(Em.FSM.Transition);

        resolutions = t.get('resolutions');

        expect(resolutions.afterEvent['transition:startedUp']).toBe('started up');
        expect(resolutions.didEnter['state:makeSmoke']).toBe('blerp smoke');

        done();
      });
    });

    it('rejects when a callback fails', function(done) {
      expect(fsm.get('isTransitioning')).toBe(false);
      expect(fsm.get('activeTransitions.length')).toBe(0);

      fsm.set('currentState', 'running');

      fsm.send('doMore').catch(function(error) {
        Em.run.next(function() {
          var args = goneBrokeDownResult.get('eventArgs')[0];
          expect(error).toBe('overheated');
          expect(args.error).toBe('overheated');
          expect(args.transition.get('fromState')).toBe('running');
          expect(args.transition.get('toState')).toBe('running');
          expect(args.transition.get('rejection')).toBe('overheated');
          expect(fsm.get('isTransitioning')).toBe(false);
          expect(fsm.get('currentState')).toBe('failed');
          done();
        });
      });
    });
  });

  describe ('transition activation', function() {
    var fsm;
    var beforeResolver;
    var beforePromise;
    var enterResolver;
    var enterPromise;
    var afterResolver;
    var afterPromise;

    beforeEach(function() {
      beforePromise = new Em.RSVP.Promise(function(resolve) {
        beforeResolver = resolve;
      });

      enterPromise = new Em.RSVP.Promise(function(resolve) {
        enterResolver = resolve;
      });

      afterPromise = new Em.RSVP.Promise(function(resolve) {
        afterResolver = resolve;
      });

      fsm = createMachine({
        states: {
          initialState: 'one'
        },

        events: {
          next: {
            transition: { one: 'two',
              before: 'resolveBefore',
              enter: 'resolveEnter',
              after: 'resolveAfter'
            }
          }
        },

        resolveBefore: function() {
          return beforePromise;
        },

        resolveEnter: function() {
          return enterPromise;
        },

        resolveAfter: function() {
          return afterPromise;
        }
      });
    });

    it('does not activate while resolving before', function(done) {
      expect(fsm.get('isTransitioning')).toBe(false);

      fsm.send('next');

      Em.run.next(function() {
        expect(fsm.get('isTransitioning')).toBe(false);
        beforeResolver();

        Em.run.next(function() {
          expect(fsm.get('isTransitioning')).toBe(true);
          enterResolver();

          Em.run.next(function() {
            expect(fsm.get('isTransitioning')).toBe(false);
            afterResolver();

            Em.run.next(function() {
              expect(fsm.get('isTransitioning')).toBe(false);
              done();
            });
          });
        });
      });
    });
  });

  describe('send (while active)', function() {
    var fsm;

    beforeEach(function() {
      fsm = createMachine({
        states: {
          initialState: 'one',
          knownStates: ['one', 'two', 'failed']
        },

        events: {
          stay: {
            transitions: { $same: '$same' }
          },

          next: {
            transitions: [
              { one: 'two' },
              { two: 'two' }
            ]
          },

          prev: {
            transitions: [
              { one: 'one' },
              { two: 'one' }
            ]
          }
        }
      });
    });

    it('allows transitions to the same state', function(done) {
      fsm.pushActiveTransition('t0');

      expect(fsm.get('isTransitioning')).toBe(true);
      expect(fsm.get('currentState')).toBe('one');

      fsm.send('stay').then(function() {
        Em.run.next(function() {
          expect(fsm.get('isTransitioning')).toBe(true);
          done();
        });
      });
    });

    it('does not allow transitions to other states', function() {
      fsm.pushActiveTransition('t0');

      expect(fsm.get('isTransitioning')).toBe(true);
      expect(fsm.get('currentState')).toBe('one');

      expect(function() {
        fsm.send('next');
      }).toThrowError(/unable to transition out of/);
    });
  });
});
