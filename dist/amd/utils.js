define(
  ["ember","ember/string","ember/rsvp","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"] || __dependency1__;
    var capitalize = __dependency2__.capitalize;
    var camelize = __dependency2__.camelize;
    var Promise = __dependency3__.Promise;
    var typeOf = __dependency1__.typeOf;
    var get = __dependency1__.get;

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
      return typeOf(thing) === 'array' ? thing : [thing];
    }

    __exports__.toArray = toArray;
  });