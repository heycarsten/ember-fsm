Ember FSM
=========

A promise-aware finite state machine implementation for Ember objects.

## Callbacks

Callbacks are defined on the 'target', by default the target is the state
machine itself. This can be changed manually, or by using the Stateful mixin.

```js
fsm = FSM.create({
  initialState: 'awake',

  stateEvents: {
    sleep: {
      transitions: { 'awake': 'sleeping' }
    }
  }
});

fsm.send('sleep', *eventArgs); => Promise
```

Here's what the callback cycle looks like:

| Current State | Event      | Action                                               |
|:--------------|:-----------|:-----------------------------------------------------|
| awake         | callback   | `beforeEvent('sleep', transition, *eventArgs)`       |
| awake         | callback   | `willExitState('awake', transition, *eventArgs)`     |
| awake         | callback   | `willEnterState('sleeping', transition, *eventArgs)` |
| sleeping      | _internal_ | `_setNewState_`                                      |
| sleeping      | callback   | `didExitState('awake', transition, *eventArgs)`      |
| sleeping      | callback   | `didEnterState('sleeping', transition, *eventArgs)`  |
| sleeping      | callback   | `afterEvent('sleep', transition, *eventArgs)`        |

### User defined callbacks

You are not limited to the built in callbacks, you can freely provide your own
callbacks in your state machine definition:

```js
fsm = FSM.create({
  stateEvents: {
    sleep: {
      transitions: { from: 'awake', to: 'sleeping', action: 'startedSleeping' }
    },

    awake: {
      transitions: { from: 'sleeping', to: 'awake', before: 'prepareBath' }
    }
  }
});
```

User defined callbacks have a reversed argument signature than the built-in
callbacks, since the context is known when they are defined, the contextual
arguments are last. For example, take the `startedSleeping` event specified
in the definition above, here's how it would be called:

```js
fsm.send('sleep', 6, 'hours')
```

Would call:

```js
target.startedSleeping(6, 'hours', newState, transition)
```

### Asynchronicity in callbacks

If callbacks return a promise, the next callback in the chain will not fire
until the promise is resolved. The return value of callbacks is stored in the
transition's `resolutions` object. Likewise, failures are store in the
`rejections` object.

## Substates

Substates don't technically exist, but you can namespace your states. For
example suppose a portion of your state workflow is related in some way, you can
prefix those states with a namespace. Consider the following:

```
ready
uploading.requestingUrl
uploading.sendingData
processing.enqueuing
processing.working
finished
```

When you define states like this, Ember.FSM automatically generates the
following boolean accessor properties for you:

```
isReady
isUploading
isUploadingRequestingUrl
isUploadingSendingData
isProcessing
isProcessingEnqueuiing
isProcessingWorking
isFinished
```
