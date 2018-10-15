import EmberError from '@ember/error';

export function reject() {
  throw new EmberError('rejected transition');
}
