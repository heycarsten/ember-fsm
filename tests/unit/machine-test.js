import { next } from '@ember/runloop';
import EmberObject from '@ember/object';
import { resolve, reject, Promise } from 'rsvp';
import { Machine, Transition } from 'ember-fsm';
import sinon from 'sinon';
import { module, test } from 'qunit';
import { createMachine, createBasicMachine } from '../helpers/factories';
import { contains } from 'ember-fsm/utils';
import {
  startIgnoringRejections,
  stopIgnoringRejections
} from '../helpers/ignore-rejections';

module('Unit: ember-fsm/-machine - create', function() {
  test('adds a default error event and finished state if none is provided', function(assert) {
    let fsm = createMachine({
      events: {
        one: { transitions: { initialized: 'a' } }
      }
    });

    assert.strictEqual(fsm.get('stateNames.length'), 3);
    assert.ok(contains(fsm.get('stateNames'), 'failed'), 'contains "failed" state');
    assert.strictEqual(fsm.get('eventNames.length'), 2, 'has two events');
    assert.ok(contains(fsm.get('eventNames'), 'error'), 'contains "error" event');
  });

  test('does not add default error event if one is provided by the user', function(assert) {
    let fsm = createMachine({
      events: {
        one: { transition: { initialized: 'a' } },
        error: { transition: { a: 'broken' } }
      }
    });

    assert.notOk(contains(fsm.get('stateNames'), 'failed'));
  });

  test('sets the currentState to the initialState', function(assert) {
    let fsm = createMachine({
      states: { initialState: 'ready' },
      events: { one: { transition: { ready: 'a' } } }
    });

    assert.strictEqual(fsm.get('currentState'), 'ready');
  });

  test('sets the currentState to the overruled initialState', function(assert) {
    let fsm = createMachine({
      initialState: 'done',
      states: {
        initialState: 'ready',
      },
      events: {
        one: { transition: { ready: 'a' } },
        two: { transition: { done: 'b' } },
      }
    });

    assert.strictEqual(fsm.get('currentState'), 'done');
  });

  test('does not destruct original definition', function(assert) {
    const states = { initialState: 'one' };
    const events = {
      next: { transition: { one: 'two' } }
    };

    let M = Machine.extend({
      states,
      events
    });

    assert.strictEqual(M.create().get('currentState'), 'one');
    assert.strictEqual(M.create().get('currentState'), 'one');
  });
});

module('Unit: ember-fsm/-machine - transitionFor', function() {
  test('selects a transition based off the current state', function(assert) {
    let fsm = createBasicMachine();
    let t   = fsm.transitionFor('run');

    assert.strictEqual(t.constructor, Transition);
    assert.strictEqual(t.toState, 'active.running');
  });

  test('considers guards when selecting a transition', function(assert) {
    let fsm = createBasicMachine({
      states: {
        initialState: 'active.running'
      },
      atMaxSpeed: true
    });

    assert.strictEqual(fsm.get('currentState'), 'active.running');
    assert.strictEqual(fsm.transitionFor('trip').toState, 'injured');

    fsm.set('atMaxSpeed', false);

    assert.strictEqual(fsm.transitionFor('trip').toState, 'inactive');
  });
});

module('Unit: ember-fsm/-machine - inState', function() {
  test('throws an error if the passed state name does not exist', function(assert) {
    let fsm = createBasicMachine();

    assert.throws(() => {
      fsm.inState('herp');
    }, /no states or substates/);
  });

  test('returns true for namespace match', function(assert) {
    let fsm = createBasicMachine({
      states: { initialState: 'active.running' }
    });

    assert.strictEqual(fsm.get('currentState'), 'active.running');
    assert.ok(fsm.inState('active'));
    assert.ok(fsm.inState('active.running'));
    assert.notOk(fsm.inState('inactive'));
  });

  test('returns true for a state match', function(assert) {
    let fsm = createBasicMachine();
    assert.ok(fsm.inState('inactive'));
  });
});

module('Unit: ember-fsm/-machine - isIn{{stateName}} accessors', function() {
  test('returns true if it matches the current state', function(assert) {
    let fsm = createBasicMachine();

    assert.strictEqual(fsm.get('currentState'), 'inactive');
    assert.strictEqual(fsm.get('isInInactive'), true);
    assert.strictEqual(fsm.get('isInActiveRunning'), false);
  });

  test('returns true if it matches the current state namespace', function(assert) {
    let fsm = createBasicMachine();

    fsm.set('currentState', 'active.running');

    assert.strictEqual(fsm.get('currentState'), 'active.running');
    assert.strictEqual(fsm.get('isInActive'), true);
    assert.strictEqual(fsm.get('isInActiveRunning'), true);
    assert.strictEqual(fsm.get('isInInactive'), false);
  });

  test('is invalidated when the current state changes', function(assert) {
    let fsm = createBasicMachine();
    assert.strictEqual(fsm.get('isInInactive'), true);

    fsm.set('currentState', 'active.running');
    assert.strictEqual(fsm.get('isInInactive'), false);

    fsm.set('currentState', 'inactive');
    assert.strictEqual(fsm.get('isInInactive'), true);
  });
});

module('Unit: ember-fsm/-machine - canEnterState', function() {
  test('returns true if the requested state can be entered from the current state on any event', function(assert) {
    let fsm = createBasicMachine();

    assert.strictEqual(fsm.get('currentState'), 'inactive');

    assert.strictEqual(fsm.canEnterState('active.running'), true);
    assert.strictEqual(fsm.canEnterState('injured'), false);

    fsm.set('currentState', 'active.running');
    fsm.set('atMaxSpeed', true);

    assert.strictEqual(fsm.canEnterState('injured'), true);
  });
});

module('Unit: ember-fsm/-machine - send', function(hooks) {
  hooks.afterEach(function() {
    stopIgnoringRejections();
  });

  hooks.beforeEach(function() {
    startIgnoringRejections();

    this.makeSmoke = sinon.spy(function() {
      return 'blerp smoke';
    });

    this.stopSmoke = sinon.spy(function() {
      return 'i yelling';
    });

    this.startedUp = sinon.spy(function() {
      return 'started up';
    });

    this.shutDown = sinon.spy(function() {
      return resolve('shut down');
    });

    this.throwError = sinon.spy(function() {
      return reject('exploded');
    });

    this.increaseWorkload = sinon.spy(function() {
      throw 'overheated';
    });

    let runner = this;

    this.target = EmberObject.create({
      makeSmoke: this.makeSmoke,
      stopSmoke: this.stopSmoke,
      startedUp: this.startedUp,
      shutDown: this.shutDown,
      throwError: this.throwError,
      increaseWorkload: this.increaseWorkload,
      goneBrokeDown(transition) {
        runner.goneBrokeDownResult = transition;
      }
    });

    this.fsm = createMachine({
      target: this.target,

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

  test('runs the transition and all related callbacks', function(assert) {
    let done = assert.async();

    assert.strictEqual(this.fsm.get('currentState'), 'stopped');

    this.fsm.send('start').then(() => {
      let c0 = this.startedUp.getCall(0);
      let a0 = c0.args[0];

      let c1 = this.makeSmoke.getCall(0);
      let a1 = c1.args[0];

      assert.strictEqual(this.fsm.get('currentState'), 'running');

      assert.ok(this.startedUp.calledOnce);
      assert.ok(this.makeSmoke.calledOnce);

      assert.strictEqual(c0.args.length, 1);
      assert.strictEqual(c1.args.length, 1);

      assert.strictEqual(a0.constructor, Transition);
      assert.strictEqual(a1.constructor, Transition);

      assert.strictEqual(a0.get('fromState'), 'stopped');
      assert.strictEqual(a0.get('toState'), 'running');

      done();
    });
  });

  test('captures results in the transition', function(assert) {
    let done = assert.async();

    this.fsm.send('start').then((t) => {
      assert.strictEqual(t.constructor, Transition);

      let resolutions = t.get('resolutions');

      assert.strictEqual(resolutions.afterEvent['transition:startedUp'], 'started up');
      assert.strictEqual(resolutions.didEnter['state:makeSmoke'], 'blerp smoke');

      done();
    });
  });

  test('rejects when a callback fails', function(assert) {
    let done = assert.async();

    assert.strictEqual(this.fsm.get('isTransitioning'), false);
    assert.strictEqual(this.fsm.get('activeTransitions.length'), 0);

    this.fsm.set('currentState', 'running');

    this.fsm.send('doMore').catch((error) => {
      next(() => {
        let args = this.goneBrokeDownResult.get('eventArgs')[0];

        assert.strictEqual(error, 'overheated');
        assert.strictEqual(args.error, 'overheated');
        assert.strictEqual(args.transition.get('fromState'), 'running');
        assert.strictEqual(args.transition.get('toState'), 'running');
        assert.strictEqual(args.transition.get('rejection'), 'overheated');
        assert.strictEqual(this.fsm.get('isTransitioning'), false);
        assert.strictEqual(this.fsm.get('currentState'), 'failed');

        done();
      });
    });
  });
});

module('Unit: ember-fsm/-machine - transition activation', function(hooks) {
  hooks.beforeEach(function() {
    startIgnoringRejections();

    let runner = this;

    this.beforePromise = new Promise((resolve) => {
      this.beforeResolver = resolve;
    });

    this.enterPromise = new Promise((resolve) => {
      this.enterResolver = resolve;
    });

    this.afterPromise = new Promise((resolve) => {
      this.afterResolver = resolve;
    });

    this.fsm = createMachine({
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

      resolveBefore() {
        return runner.beforePromise;
      },

      resolveEnter() {
        return runner.enterPromise;
      },

      resolveAfter() {
        return runner.afterPromise;
      }
    });
  });

  hooks.afterEach(function() {
    stopIgnoringRejections();
  });


  test('does not activate while resolving before', function(assert) {
    let done = assert.async();

    assert.strictEqual(this.fsm.get('isTransitioning'), false);
    this.fsm.send('next');

    next(() => {
      assert.strictEqual(this.fsm.get('isTransitioning'), false);
      this.beforeResolver();

      next(() => {
        assert.strictEqual(this.fsm.get('isTransitioning'), true);
        this.enterResolver();

        next(() => {
          assert.strictEqual(this.fsm.get('isTransitioning'), false);
          this.afterResolver();

          next(() => {
            assert.strictEqual(this.fsm.get('isTransitioning'), false);
            done();
          });
        });
      });
    });
  });
});

module('Unit: ember-fsm/-machine - send (while active)', function(hooks) {
  hooks.beforeEach(function() {
    this.fsm = createMachine({
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

  test('allows transitions to the same state', function(assert) {
    let done = assert.async();

    this.fsm.pushActiveTransition('t0');

    assert.strictEqual(this.fsm.get('isTransitioning'), true);
    assert.strictEqual(this.fsm.get('currentState'), 'one');

    this.fsm.send('stay').then(() => {
      next(() => {
        assert.strictEqual(this.fsm.get('isTransitioning'), true);
        done();
      });
    });
  });

  test('does not allow transitions to other states', function(assert) {
    this.fsm.pushActiveTransition('t0');

    assert.strictEqual(this.fsm.get('isTransitioning'), true);
    assert.strictEqual(this.fsm.get('currentState'), 'one');

    assert.throws(() => {
      this.fsm.send('next');
    }, /unable to transition out of/);
  });
});
