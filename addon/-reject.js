import Ember from 'ember';

export function reject() {
  throw new Ember.Error('rejected transition');
}
