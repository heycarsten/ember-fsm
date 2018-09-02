import { reject } from 'ember-fsm';
import { module, test } from 'qunit';

module('Unit: ember-fsm/-reject', function() {
  test('is a function', function(assert) {
    assert.strictEqual(typeof reject, 'function');
  });

  test('throws an error when called', function(assert) {
    assert.throws(function() {
      reject();
    });
  });
});
