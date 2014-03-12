"use strict";
var Ember = require("ember")["default"] || require("ember");

function reject() {
  throw new Ember.Error('rejected transition');
}

exports.reject = reject;