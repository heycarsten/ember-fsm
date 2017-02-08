import Ember from 'ember';

const MEMO = {};

export function startIgnoringRejections() {
  MEMO.originalLoggerError = Ember.Logger.error;
  MEMO.originalTestAdapterException = Ember.Test.adapter.exception;

  Ember.Logger.error = function() {};
  Ember.Test.adapter.exception = function() {};
}

export function stopIgnoringRejections() {
  Ember.Logger.error = MEMO.originalLoggerError;
  Ember.Test.adapter.exception = MEMO.originalTestAdapterException;

  MEMO.originalLoggerError = undefined;
  MEMO.originalTestAdapterException = undefined;
}
