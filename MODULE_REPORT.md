## Module Report
### Unknown Global

**Global**: `Ember.Logger`

**Location**: `tests/helpers/ignore-rejections.js` at line 6

```js

export function startIgnoringRejections() {
  MEMO.originalLoggerError = Ember.Logger.error;
  MEMO.originalTestAdapterException = Ember.Test.adapter.exception;

```

### Unknown Global

**Global**: `Ember.Test`

**Location**: `tests/helpers/ignore-rejections.js` at line 7

```js
export function startIgnoringRejections() {
  MEMO.originalLoggerError = Ember.Logger.error;
  MEMO.originalTestAdapterException = Ember.Test.adapter.exception;

  Ember.Logger.error = function() {};
```

### Unknown Global

**Global**: `Ember.Logger`

**Location**: `tests/helpers/ignore-rejections.js` at line 9

```js
  MEMO.originalTestAdapterException = Ember.Test.adapter.exception;

  Ember.Logger.error = function() {};
  Ember.Test.adapter.exception = function() {};
}
```

### Unknown Global

**Global**: `Ember.Test`

**Location**: `tests/helpers/ignore-rejections.js` at line 10

```js

  Ember.Logger.error = function() {};
  Ember.Test.adapter.exception = function() {};
}

```

### Unknown Global

**Global**: `Ember.Logger`

**Location**: `tests/helpers/ignore-rejections.js` at line 14

```js

export function stopIgnoringRejections() {
  Ember.Logger.error = MEMO.originalLoggerError;
  Ember.Test.adapter.exception = MEMO.originalTestAdapterException;

```

### Unknown Global

**Global**: `Ember.Test`

**Location**: `tests/helpers/ignore-rejections.js` at line 15

```js
export function stopIgnoringRejections() {
  Ember.Logger.error = MEMO.originalLoggerError;
  Ember.Test.adapter.exception = MEMO.originalTestAdapterException;

  MEMO.originalLoggerError = undefined;
```
