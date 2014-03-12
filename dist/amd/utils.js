define(
  ["ember/string","ember/rsvp","ember","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var capitalize = __dependency1__.capitalize;
    var camelize = __dependency1__.camelize;
    var Promise = __dependency2__.Promise;
    var typeOf = __dependency3__.typeOf;

    function isThenable(thing) {
      return typeOf(thing) === 'object' && typeOf(thing.then) === 'function';
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