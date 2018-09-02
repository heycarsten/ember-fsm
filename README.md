# Ember FSM

#### A promise-aware finite state machine implementation for Ember

[A wild (and current) traffic light demo appears!](https://ember-twiddle.com/7136a752d42aee13c1072c96480494f4)

```js
import FSM from 'ember-fsm';

let trafficSignal = FSM.Machine.create({
  events: {
    cycle: {
      transitions: [
        { initialized: 'red' },
        { red: 'green' },
        { green: 'amber' },
        { amber: 'red' }
      ]
    },

    powerDown: {
      transition: { $all: 'off' }
    }
  }
});

trafficSignal.get('currentState');
// "initialized"

trafficSignal.send('cycle');
trafficSignal.get('currentState');
// "red"

trafficSignal.send('cycle');
trafficSignal.get('currentState')
// "green"
```

## Getting Started

Install as an Ember Addon

```
ember install ember-fsm
```

### Do you need this?

Try really hard not to need it, if you need it, I'm sorry. -- @heycarsten

### Defining a State Machine

```js
import FSM from 'ember-fsm';

let SleepyFSM = FSM.Machine.extend({
  // Here is where you define your state machine's state-specific configuration.
  // This section is optional.
  states: {
    // The default initial state is "initialized"
    initialState: 'awake'

    // If you'd like, you can choose to explicitly define the names of your
    // states:
    knownStates: ['sleeping', 'angry', 'awake', 'initialized', 'failed'],

    // You can define global per-state callbacks, they will fire whenever the
    // state will be entered, was entered, will be exited, or was exited.
    sleeping: {
      willEnter() { },
      didEnter() { },
      willExit() { },
      didExit() { }
    }
  },

  // Here's where you define your state machine's events, it is required.
  events: {
    sleep: {
      // You can define global per-event callbacks. These will fire for any
      // transition before or after this event.
      before() { },
      after() { },

      // This is where the event's transitions are defined, it is also aliased
      // to "transition". It can accept either a single object like one in the
      // array below, or an array of transition definition objects:
      transitions: [
        { awake: 'sleeping', doUnless: 'unableToSleep' },
        { awake: 'angry', doIf: 'unableToSleep' },
        { sleeping: '$same' }
      ]
    },

    // By default this error event is injected into your state machine for you,
    // you can override it and provide your own transitions and callbacks if
    // you'd like.
    error: {
      transition: { $all: 'failed' }
    }
  }
});
```

### State Macros

For the sake of less typing (and less chances of introducing failure) the
following macros can be used in transition definitions:

| Macro      | Description                   |
|:-----------|:------------------------------|
| `$all`     | Expands to all known states.  |
| `$same`    | Expands to the same state as the from state. `transition: { sleeping: '$same' }` |
| `$initial` | Expands to the initial state. |

### Transition Guarding

You can specify that a transition be excluded or included in the event using
`doIf` or `doUnless`. Consider `SleepyFSM` above, if we set `unableToSleep` to
`true` then when we send in the `sleep` event, it will transition to the state
`angry` because the transition `{ awake: 'sleeping' }` will be excluded from
the list.

`doIf` and `doUnless` are aliased to `guard` and `unless` respectively.

### Transition Events & Callbacks

Given the `SleepyFSM` example above, suppose we ran the following:

```js
let fsm = SleepyFSM.create();
fsm.send('sleep');
```

Here is the series of transition events that will occurr and the corresponding
callbacks that will run and where they can be defined:

| Current State | Is Active | Event                    | Runs callbacks                        |
|:--------------|:----------|:-------------------------|:--------------------------------------|
| awake         | **false** | `beforeEvent`            | `before` on events and transitions    |
| awake         | **true**  | `_activateTransition_`   | _internal_                            |
| awake         | **true**  | `willExit`               | `willExit` on states and transitions  |
| awake         | **true**  | `willEnter`              | `willEnter` on states and transitions |
| sleeping      | **true**  | `_setNewState_`          | _internal_                            |
| sleeping      | **true**  | `didExit`                | `didExit` on states and transitions   |
| sleeping      | **true**  | `didEnter`               | `didEnter` on states and transitions  |
| sleeping      | **false** | `_deactivateTransition_` | _internal_                            |
| sleeping      | **false** | `afterEvent`             | `after` on events and transitions     |

Some of the event names above also have aliases:

| Event         | Aliases           |
|:--------------|:------------------|
| `beforeEvent` | `before`          |
| `afterEvent`  | `after`           |
| `didEnter`    | `enter`, `action` |
| `didExit`     | `exit`            |

### Asynchronicity In Callbacks

If callbacks return a promise, the next callback in the chain will not fire
until the promise is resolved. The return value of callbacks is stored in the
transition's `resolutions` object. Likewise, rejections are stored in the
`rejections` object of the transition.

### Namespacing States

`ember-fsm` doesn't provide true sub-state support, but you can namespace your
states. For example, suppose a portion of your state workflow is related in
some way; you can prefix those states with a namespace:

* ready
* uploading.requestingUrl
* uploading.sendingData
* processing.enqueuing
* processing.working
* finished

When you define states like this, Ember.FSM automatically generates the
following boolean accessor properties for you:

* isInReady
* isInUploading
* isInUploadingRequestingUrl
* isInUploadingSendingData
* isInProcessing
* isInProcessingEnqueuing
* isInProcessingWorking
* isInFinished

### Stateful Mixin

When it comes to using `ember-fsm` in your application, you'll almost always
want to use `FSM.Stateful` over sub-classing `FSM.Machine`. This way
you can formalize a state workflow around something like file uploads where you
might have to incorporate three different proceesses into on user experience.

Note: States and events are renamed in the mixin to `fsmStates` and `fsmEvents`
respectively, to avoid conflict with core Ember properties.

Building these sorts of workflows implicitly as-you-code-along can be a recipie
for massive sadness. So why be sad? Formalize that workflow! Here's an example
of how adding `ember-fsm` to a controller can remove a lot of the
tedious parts of workflow managment:

```js
import Ember from 'ember';
import FSM from 'ember-fsm';

// controllers/upload.js
export default Ember.Controller.extend(FSM.Stateful, {
  needs: 'notifier',

  actions: {
    uploadFile(file) {
      this.set('file', file);
      this.sendStateEvent('addFile');
    }
  },

  fsmStates: {
    initialState: 'nofile'
  },

  fsmEvents: {
    addFile: {
      transitions: {
        from:   ['nofile', 'failed'],
        to:     'ready',
        before: 'checkFile',
      }
    },

    startUpload: {
      transitions: {
        from:     'ready',
        to:       'uploading',
        before:   'getUploadURL',
        didEnter: 'performUpload',
        after:    'finishedUpload'
      }
    },

    finishUpload: {
      transition: { uploading: 'nofile', didEnter: 'reset' }
    }
  },

  reset() {
    this.set('file', null);
  },

  checkFile() {
    let file = this.get('file');

    if (file.size > 0) {
      return;
    } else {
      this.get('controllers.notifier').warn('file must have content');
      FSM.reject(); // A helper for throwing an error
    }
  },

  getUploadURL() {
    let fileName = this.get('file.name');

    let xhr = Ember.$.ajax('/api/signed_uploads', {
      type: 'put',
      data: { file: { name: fileName } }
    });

    xhr.then((payload) => {
      Ember.run(() => {
        this.set('uploadToURL', payload.signed_upload.url);
      });
    });

    return xhr; // Causes transition to block until promise is settled
  },

  performUpload() {
    return Ember.$.ajax(this.get('uploadToURL'), {
      type: 'put',
      data: this.get('file')
    });
  },

  finishedUpload() {
    this.get('controllers.notifier').success('Upload complete');
    this.sendStateEvent('finishUpload');
  }
});
```

### Running tests

* `ember test` – Runs the test suite on the current Ember version
* `ember test --server` – Runs the test suite in "watch mode"
* `ember try:each` – Runs the test suite against multiple Ember versions

### Running the dummy application

* `ember serve`
* Visit the dummy application at [http://localhost:4200](http://localhost:4200).

<<<<<<< HEAD
## Thanks

- [@hhff](https://github.com/hhff) for the continued support and feedback
- [@joliss](https://github.com/joliss) for all her hard work on [broccoli](https://github.com/joliss/broccoli)
- [@rpflorence](https://github.com/rpflorence) for all of his work on [broccoli-dist-es6-module](https://github.com/rpflorence/broccoli-dist-es6-module)
- [@obrie](https://github.com/obrie) for the Ruby [state_machine](https://github.com/pluginaweek/state_machine) gem, which was my first introduction to state machines
- [@tildeio](https://github.com/tildeio) & crew for [RSVP](https://github.com/tildeio/rsvp.js) and [Ember](https://github.com/emberjs/ember.js)
- My coworkers and friends [@elucid](https://github.com/elucid) [@ghedamat](https://github.com/ghedamat) [@drteeth](https://github.com/drteeth) [@minusfive](https://github.com/minusfive) for reviewing and fiddling with the stuff I make
- [Unspace](https://unspace.ca) for understanding open source and caring about open source
- [@ssured](https://github.com/ssured) for adding the ability to define callbacks as inline functions
=======
For more information on using ember-cli, visit [https://ember-cli.com/](https://ember-cli.com/).

License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
>>>>>>> 2fc527d... message
