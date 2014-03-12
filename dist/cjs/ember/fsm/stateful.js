"use strict";
var Mixin = require("ember").Mixin;
var required = require("ember").required;
var computed = require("ember").computed;
var Machine = require("./machine").Machine;

exports["default"] = Mixin.create({
  initialState: undefined,
  stateEvents:  required(),
  isLoading:    computed.oneWay('fsm.isTransitioning'),
  currentState: computed.oneWay('fsm.currentState'),

  init: function() {
    var initialState;
    var params = {};
    var boolAccesorsMixin = {};

    params.stateEvents = this.get('stateEvents');
    params.target      = this;

    if ((initialState = this.get('initialState'))) {
      params.initialState = initialState;
    }

    this.set('fsm', Machine.create(params));

    this.get('fsm')._booleanStateAccessors_.forEach(function(accessor) {
      boolAccesorsMixin[accessor] = computed.oneWay('fsm.' + accessor);
    });

    this.reopen(boolAccesorsMixin);

    this._super();
  },

  sendStateEvent: function() {
    var fsm = this.get('fsm');
    return fsm.send.apply(fsm, arguments);
  }
});