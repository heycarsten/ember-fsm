define(
  ["ember/string","ember/rsvp","ember","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var capitalize = __dependency1__.capitalize;
    var camelize = __dependency1__.camelize;
    var Promise = __dependency2__.Promise;
    var typeOf = __dependency3__.typeOf;
    var get = __dependency3__.get;

    function isThenable(thing) {
      var thingType = typeOf(thing);

      if (thingType === 'object' || thingType === 'instance') {
        return typeOf(get(thing, 'then')) === 'function';
      } else {
        return false;
      }
    }

    __exports__.isThenable = isThenable;// Takes a function, calls it, then wraps the result in a promise if it's not
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

    __exports__.withPromise = withPromise;function capitalCamelize(str) {
      return capitalize(camelize(str));
    }

    __exports__.capitalCamelize = capitalCamelize;function toArray(thing) {
      if (thing === undefined) {
        return [];
      }

      return typeOf(thing) === 'array' ? thing : [thing];
    }

    __exports__.toArray = toArray;function ownPropertiesOf(object) {
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

    __exports__.ownPropertiesOf = ownPropertiesOf;function isObject(obj) {
      var type = typeOf(obj);
      return type === 'class' || type === 'instance' || type === 'object';
    }

    __exports__.isObject = isObject;function getFirst(obj, properties) {
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

    __exports__.getFirst = getFirst;function bind(target, fn) {
      return function() {
        return fn.apply(target, arguments);
      };
    }

    __exports__.bind = bind;function contains(array, item) {
      return array.indexOf(item) >= 0;
    }

    __exports__.contains = contains;
  });