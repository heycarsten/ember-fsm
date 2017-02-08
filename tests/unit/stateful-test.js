import Ember from 'ember';
import { Stateful } from 'ember-fsm';
import { module, test } from 'qunit';

module('Unit: ember-fsm/-stateful', {
  beforeEach() {
    this.sO = Ember.Object.extend(Stateful, {
      fsmStates: {
        initialState: 'cool'
      },

      fsmEvents: {
        blerp: { transition: { cool: 'herp' } }
      }
    });

    this.so = this.sO.create();
    this.fsm = this.so.get('__fsm__');
  }
});

test('sets the state machine target to the includer', function(assert) {
  assert.strictEqual(this.so, this.fsm.get('target'));
});

test('provides fsmCurrentState', function(assert) {
  assert.strictEqual(this.so.get('fsmCurrentState'), 'cool');
});

test('can override the initial state', function(assert) {
  let so = this.sO.create({ fsmInitialState: 'herp' });
  assert.strictEqual(so.get('fsmCurrentState'), 'herp');
});

test('provides fsmIsLoading', function(assert) {
  assert.strictEqual(this.so.get('fsmIsLoading'), false);
  this.fsm.pushActiveTransition('t0');
  assert.strictEqual(this.so.get('fsmIsLoading'), true);
});

test('provides isIn{{State}} accessors', function(assert) {
  assert.ok(this.so.get('isInCool'));
  assert.notOk(this.so.get('isInHerp'));
});

test('delegates sendStateEvent to fsm.send', function(assert) {
  let done = assert.async();

  this.so.sendStateEvent('blerp').then(() => {
    Ember.run.next(() => {
      assert.strictEqual(this.so.get('fsmCurrentState'), 'herp');
      done();
    });
  });
});