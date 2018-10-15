import { typeOf } from '@ember/utils';
import FSM from 'ember-fsm';
import { module, test } from 'qunit';

module('Unit: ember-fsm/index', function() {
  test('exists', function(assert) {
    assert.strictEqual(typeOf(FSM), 'object');
  });

  test('imports Definition', function(assert) {
    assert.strictEqual(typeOf(FSM.Definition), 'function');
  });

  test('imports Machine', function(assert) {
    assert.strictEqual(typeOf(FSM.Machine), 'class');
  });

  test('imports Transition', function(assert) {
    assert.strictEqual(typeOf(FSM.Transition), 'class');
  });

  test('imports Stateful', function(assert) {
    assert.strictEqual(typeOf(FSM.Stateful), 'object');
  });

  test('imports reject', function(assert) {
    assert.strictEqual(typeOf(FSM.reject), 'function');
  });
});
