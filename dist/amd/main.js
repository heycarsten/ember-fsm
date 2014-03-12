define(
  ["./ember/fsm/machine","./ember/fsm/transition","./ember/fsm/stateful","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    /*!
    ember-fsm
    (c) 2014 Carsten Nielsen
    - License: https://github.com/heycarsten/ember-fsm/blob/master/LICENSE
    */

    var Machine = __dependency1__["default"] || __dependency1__;
    var Transition = __dependency2__["default"] || __dependency2__;
    var Stateful = __dependency3__["default"] || __dependency3__;

    __exports__.Machine = Machine;
    __exports__.Transition = Transition;
    __exports__.Stateful = Stateful;
  });