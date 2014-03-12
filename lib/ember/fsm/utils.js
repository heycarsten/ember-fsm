import { capitalize, camelize } from 'ember/string';
import { Promise } from 'ember/rsvp';
import { typeOf } from 'ember';

export function isThenable(thing) {
  return typeOf(thing) === 'object' && typeOf(thing.then) === 'function';
}

// Takes a function, calls it, then wraps the result in a promise if it's not
// already a promise. If the function throws an error it is caught and called as
// the rejector of the created promise.
export function withPromise(block) {
  var response;
  var exception;

  try {
    response = block();
  } catch(e) {
    exception = e;
  }

  if (isThenable(response)) {
    return response;
  } else {
    return new Promise(function(resolve, reject) {
      if (exception) {
        reject(exception);
      } else {
        resolve(response);
      }
    });
  }
}

export function capitalCamelize(str) {
  return capitalize(camelize(str));
}

export function toArray(thing) {
  return typeOf(thing) === 'array' ? thing : [thing];
}
