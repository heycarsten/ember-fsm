import Ember from 'ember';
import { Transition } from 'ember-fsm';
import { module, test } from 'qunit';
import sinon from 'sinon';
import { createCallbackMachine } from '../helpers/factories';
import {
  startIgnoringRejections,
  stopIgnoringRejections
} from '../helpers/ignore-rejections';

module('Unit: ember-fsm/-transition - initialization', {
  beforeEach() {
    this.t = Transition.create();
  }
});

test('sets resolutions object', function(assert) {
  assert.deepEqual(this.t.get('resolutions'), {});
});

test('sets rejections object', function(assert) {
  assert.deepEqual(this.t.get('rejections'), {});
});

module('Unit: ember-fsm/-transition - callbacksFor');

test('returns all known callbacks for given transition event type', function(assert) {
  let fsm         = createCallbackMachine({ states: { initialState: 'okay' } });
  let t           = fsm.transitionFor('cuddleKitty');
  let didEnterCbs = t.callbacksFor('didEnter');
  let beforeCbs   = t.callbacksFor('beforeEvent');
  let afterCbs    = t.callbacksFor('afterEvent');

  assert.strictEqual(fsm.get('currentState'), 'okay');
  assert.strictEqual(t.callbacksFor('willEnter').length, 0);
  assert.strictEqual(didEnterCbs.length, 2);
  assert.strictEqual(beforeCbs.length, 2);
  assert.strictEqual(afterCbs.length, 2);
});

test('throws an error when the callbacks have not been defined on target', function(assert) {
  assert.throws(function() {
    let fsm = createCallbackMachine({
      states: { initialState: 'sad' }
    });
    let t = fsm.transitionFor('leaveKitty');

    t.callbacksFor('didEnter');
  }, /Assertion Failed: Callback .+ on target/);
});

module('Unit: ember-fsm/-transition - callback');

test('merges callbacks into one promise and tracks resolutions in the transition', function(assert) {
  let done = assert.async();

  let animateSmile = sinon.spy(() => {
    return 'i am smile very';
  });

  let playPurr = sinon.spy(() => {
    return Ember.RSVP.resolve('i am purr so many');
  });

  let fsm = createCallbackMachine({
    states: { initialState: 'okay' },
    animateSmile: animateSmile,
    playPurr: playPurr
  });

  let t = fsm.transitionFor('cuddleKitty');
  let p = t.callback('didEnter');

  p.then(() => {
    let resolutions = t.resolutions.didEnter;

    assert.ok(playPurr.calledOnce);
    assert.ok(animateSmile.calledOnce);

    assert.strictEqual(resolutions['state:animateSmile'], 'i am smile very');
    assert.strictEqual(resolutions['transition:playPurr'], 'i am purr so many');

    done();
  });
});

module('Unit: ember-fsm/-transition - inline callback');

test('merges all callbacks into one promise for the entire transition event and tracks resolutions in the transition', function(assert) {
  let done = assert.async();

  let animateSmile = sinon.spy(() => {
    return 'i am smile very';
  });

  let fsm = createCallbackMachine({
    states: {
      initialState: 'okay',
      happy: {
        didEnter: animateSmile
      }
    }
  });

  let t = fsm.transitionFor('cuddleKitty');
  let p = t.callback('didEnter');

  p.then(() => {
    let resolutions = t.resolutions.didEnter;

    assert.ok(animateSmile.calledOnce);
    assert.strictEqual(resolutions['state:_inline:1-0_'], 'i am smile very');

    done();
  });
});

module('Unit: ember-fsm/-transition - perform', {
  beforeEach() {
    startIgnoringRejections();
  },

  afterEach() {
    stopIgnoringRejections();
  }
});

test('returns a promise that is resolved when all callbacks resolve', function(assert) {
  let done = assert.async();

  let fsm = createCallbackMachine({
    becameOkay() { },
    stopAnimations() { }
  });

  let t = fsm.transitionFor('wakeKitty');

  t.perform().then((outcome) => {
    assert.strictEqual(outcome, t);
    done();
  });
});

test('returns a promise that is rejected when a callback rejects', function(assert) {
  let done = assert.async();

  let fsm = createCallbackMachine({
    becameOkay() { },
    stopAnimations() {
      throw('~_~');
    }
  });

  let t = fsm.transitionFor('wakeKitty');

  t.perform().catch((err) => {
    assert.strictEqual(err, '~_~', 'returns the last error thrown');
    assert.strictEqual(t.get('rejections').didEnter['state:stopAnimations'], '~_~');
    assert.strictEqual(t.get('rejection'), '~_~');
    done();
  });
});

module('Unit: ember-fsm/-transition - isResolving');

test('is null before the transition resolves', function(assert) {
  let fsm = createCallbackMachine();
  let t = fsm.transitionFor('wakeKitty');
  assert.strictEqual(t.get('isResolving'), null);
});

test('is false after the transition resolves', function(assert) {
  let done = assert.async();

  let fsm = createCallbackMachine({
    becameOkay() { },
    stopAnimations() { }
  });

  let t = fsm.transitionFor('wakeKitty');

  t.perform().then(() => {
    assert.notOk(t.get('isResolving'));
    done();
  });
});

test('is true while transition resolves', function(assert) {
  let done = assert.async();
  let promise;
  let resolver;
  let fsm;
  let t;

  promise = new Ember.RSVP.Promise((resolve) => {
    resolver = resolve;
  });

  fsm = createCallbackMachine({
    stopAnimations() { },
    becameOkay() {
      return promise;
    }
  });

  t = fsm.transitionFor('wakeKitty');

  t.perform();

  Ember.run.next(() => {
    assert.strictEqual(t.get('isResolving'), true);
    resolver();

    Ember.run.next(() => {
      assert.strictEqual(t.get('isResolving'), false);
      done();
    });
  });
});

module('Unit: ember-fsm/-transition - isRejected', {
  beforeEach() {
    startIgnoringRejections();

    this.fsm = createCallbackMachine({
      becameOkay() { },
      resetFace() { },
      stopAnimations() {
        throw('fail');
      }
    });

    this.t = this.fsm.transitionFor('wakeKitty');
  },

  afterEach() {
    stopIgnoringRejections();
  }
});

test('is null before the transition resolves', function(assert) {
  assert.strictEqual(this.t.get('isRejected'), null);
});

test('is true after the transition rejects', function(assert) {
  let done = assert.async();

  this.t.perform().catch(() => {
    assert.strictEqual(this.t.get('isRejected'), true);
    done();
  });
});

test('is false if the transition resolves', function(assert) {
  let done = assert.async();
  this.fsm.set('currentState', 'happy');
  let t = this.fsm.transitionFor('cuddleKitty');

  t.perform().then(() => {
    Ember.run.next(() => {
      assert.strictEqual(t.get('isRejected'), false);
      done();
    });
  });
});

module('Unit: ember-fsm/-transition - toString');

test('returns a human-readable representation of the transition', function(assert) {
  let fsm = createCallbackMachine();
  let t   = fsm.transitionFor('wakeKitty');

  assert.strictEqual(t.toString(),
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
