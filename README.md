Ember FSM
=========

A promise-aware finite state machine implementation for Ember objects.

## Callbacks

Callbacks are defined on the 'target', by default the target is the state
machine itself. This can be changed manually, or by using the Stateful mixin.

```js
fsm = Ember.FSM.Machine.create({
  initialState: 'awake',

  stateEvents: {
    sleep: {
      transitions: { 'awake': 'sleeping' }
    }
  }
});

fsm.send('sleep', *eventArgs); => RSVP.Promise
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
fsm = Ember.FSM.Machine.create({
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

## Ember.FSM.Stateful

Often you'll want to define a state machine on an object, this can be done using
the `Ember.FSM.Stateful` mixin. Here's an example of a typical use for a state
machine on an Ember object:

```js
App.UploadController = Em.Controller.extend(Em.FSM.Stateful, {
  needs: 'notifier',
  initialState: 'nofile',

  actions: {
    uploadFile: function(file) {
      this.set('file', file);
      this.sendStateEvent('addFile');
    }
  },

  stateEvents: {
    addFile: {
      transitions: {
        before: 'checkFile',
        from: ['nofile', 'failed'], to: 'ready'
      }
    },

    startUpload: {
      transitions: {
        before: 'getUploadURL',
        from: 'ready', to: 'uploading',
        action: 'performUpload',
        after: 'finishedUpload'
      }
    },

    finishUpload: {
      transitions: {
        from: 'uploading', to: 'nofile',
        action: 'reset'
      }
    }
  },

  reset: function() {
    this.set('file', null);
  },

  checkFile: function() {
    var file = this.get('file');

    if (file.size > 0) {
      return;
    } else {
      this.get('controllers.notifier').warn('file must have content');
      Em.FSM.reject(); // Just a helper for throwing an error.
    }
  },

  getUploadURL: function() {
    var controller = this;
    var fileName = this.get('file.name');
    var xhr;

    xhr = $.ajax('/api/uploads/signed_urls', {
      type: 'put',
      data: { file: { name: fileName } }
    });

    xhr.then(function(payload) {
      Em.run(function() {
        controller.set('uploadToURL', payload.signed_url.url);
      });
    });

    return xhr; // Causes transition to block until promise is settled
  },

  performUpload: function() {
    return $.ajax(this.get('uploadToURL'), {
      type: 'put',
      data: this.get('file'),
    });
  },

  finishedUpload: function() {
    this.get('controllers.notifier').success('Upload complete');
    this.sendStateEvent('finished');
  }
});
```
