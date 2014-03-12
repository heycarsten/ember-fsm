define(
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"] || __dependency1__;

    function reject() {
      throw new Ember.Error('rejected transition');
    }

    __exports__.reject = reject;
  });