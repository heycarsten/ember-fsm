import Ember from 'ember';
import FSM from 'ember-fsm';
import { module, test } from 'qunit';

module('Unit: ember-fsm/index');

test('exists', function(assert) {
  assert.strictEqual(Ember.typeOf(FSM), 'object');
});

test('imports Definition', function(assert) {
  assert.strictEqual(Ember.typeOf(FSM.Definition), 'function');
});

test('imports Machine', function(assert) {
  assert.strictEqual(Ember.typeOf(FSM.Machine), 'class');
});

test('imports Transition', function(assert) {
  assert.strictEqual(Ember.typeOf(FSM.Transition), 'class');
});

test('imports Stateful', function(assert) {
  assert.strictEqual(Ember.typeOf(FSM.Stateful), 'object');
});

test('imports reject', function(assert) {
  assert.strictEqual(Ember.typeOf(FSM.reject), 'function');
});
