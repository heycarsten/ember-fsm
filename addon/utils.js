import Ember from 'ember';

const {
  String: { capitalize, camelize },
  RSVP: { Promise },
  typeOf,
  get
} = Ember;

export function isThenable(thing) {
  let thingType = typeOf(thing);

  if (thingType === 'object' || thingType === 'instance') {
    return typeOf(get(thing, 'then')) === 'function';
  } else {
    return false;
  }
}

// Takes a function, calls it, then wraps the result in a promise if it's not
// already a promise. If the function throws an error it is caught and called as
// the rejector of the created promise.
export function withPromise(block) {
  let response;
  let exception;

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
  if (thing === undefined) {
    return [];
  }

  return typeOf(thing) === 'array' ? thing : [thing];
}

export function ownPropertiesOf(object) {
  let properties = [];
  let property;

  if (!isObject(object)) {
    throw new TypeError('can\'t determine properties of: ' + object);
  }

  for (property in object) {
    if (object.hasOwnProperty(property) && object[property] !== undefined) {
      properties.push(property);
    }
  }

  return properties;
}

export function isObject(obj) {
  let type = typeOf(obj);
  return type === 'class' || type === 'instance' || type === 'object';
}

export function getFirst(obj, properties) {
  let value;
  let i;

  properties = toArray(properties);

  if (!isObject(obj)) {
    return value;
  }

  for (i = 0; i < properties.length; i++) {
    value = obj[properties[i]];

    if (value !== undefined) {
      break;
    }
  }

  return value;
}

export function bind(target, fn) {
  return function() {
    return fn.apply(target, arguments);
  };
}

export function contains(array, item) {
  return array.indexOf(item) >= 0;
}
