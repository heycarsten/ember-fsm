define(
  ["./machine","./transition","./stateful","./reject","./utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    /*!
    ember-fsm
    (c) 2014 Carsten Nielsen
    - License: https://github.com/heycarsten/ember-fsm/blob/master/LICENSE
    */

    var Machine = __dependency1__["default"] || __dependency1__;
    var Transition = __dependency2__["default"] || __dependency2__;
    var Stateful = __dependency3__["default"] || __dependency3__;
    var reject = __dependency4__.reject;
    var utils = __dependency5__["default"] || __dependency5__;

    __exports__.Machine = Machine;
    __exports__.Transition = Transition;
    __exports__.Stateful = Stateful;
    __exports__.reject = reject;
    __exports__.utils = utils;
  });