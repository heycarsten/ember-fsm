"use strict";
var capitalize = require("ember/string").capitalize;
var camelize = require("ember/string").camelize;
var Promise = require("ember/rsvp").Promise;
var typeOf = require("ember").typeOf;
var get = require("ember").get;

function isThenable(thing) {
  var thingType = typeOf(thing);

  if (thingType === 'object' || thingType === 'instance') {
    return typeOf(get(thing, 'then')) === 'function';
  } else {
    return false;
  }
}

exports.isThenable = isThenable;// Takes a function, calls it, then wraps the result in a promise if it's not
// already a promise. If the function throws an error it is caught and called as
// the rejector of the created promise.
function withPromise(block) {
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

exports.withPromise = withPromise;function capitalCamelize(str) {
  return capitalize(camelize(str));
}

exports.capitalCamelize = capitalCamelize;function toArray(thing) {
  if (thing === undefined) {
    return [];
  }

  return typeOf(thing) === 'array' ? thing : [thing];
}

exports.toArray = toArray;function ownPropertiesOf(object) {
  var properties = [];
  var property;

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

exports.ownPropertiesOf = ownPropertiesOf;function isObject(obj) {
  var type = typeOf(obj);
  return type === 'class' || type === 'instance' || type === 'object';
}

exports.isObject = isObject;function getFirst(obj, properties) {
  var value;
  var i;

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

exports.getFirst = getFirst;