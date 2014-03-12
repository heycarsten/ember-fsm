define(
  ["ember","ember/rsvp","./utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"] || __dependency1__;
    var RSVP = __dependency2__["default"] || __dependency2__;
    var computed = __dependency1__.computed;
    var inspect = __dependency1__.inspect;
    var Promise = __dependency2__.Promise;
    var withPromise = __dependency3__.withPromise;
    var toArray = __dependency3__.toArray;

    var CALLBACKS = [
      ['beforeEvent',    'event'],
      ['willExitState',  'fromState'],
      ['willEnterState', 'toState'],
      ['_setNewState_'],
      ['didExitState',   'fromState'],
      ['didEnterState',  'toState'],
      ['afterEvent',     'event']
    ];

    __exports__["default"] = Ember.Object.extend({
      fsm:           null,
      fromState:     null,
      toState:       null,
      event:         null,
      eventArgs:     null,
      userCallbacks: null,
      target:        computed.oneWay('fsm.target'),
      currentState:  computed.alias('fsm.currentState'),
      isResolving:   null,
      isResolved:    computed.not('isResolving'),
      isRejected:    null,

      init: function() {
        this.set('resolutions', {});
        this.set('rejections',  {});
      },

      perform: function() {
        var transition = this;
        var promise;

        promise = new Promise(function(resolve, reject) {
          var currentCallbackIndex = 0;

          function settleNext() {
            var cb = CALLBACKS[currentCallbackIndex++];

            if (!cb) {
              resolve(transition);
            } else {
              transition.callback(cb[0], cb[1]).then(settleNext, reject);
            }
          }

          settleNext();
        });

        this.set('isResolving', true);

        promise.catch(function() {
          transition.set('isRejected', true);
        });

        promise.finally(function() {
          transition.set('isResolving', false);
        });

        return promise;
      },

      userCallbacksFor: function(name) {
        var target    = this.get('target');
        var userValue = this.get('userCallbacks')[name];
        var callbacks = [];

        if (!userValue) {
          return [];
        }

        toArray(userValue).forEach(function(userDefinedName) {
          var userCallbacks = this.callbacksFor(userDefinedName);

          if (!userCallbacks.length) {
            throw new Ember.Error(
              'undefined callback ' + inspect(userDefinedName) + ' on ' +
              'target ' + inspect(target) + ' for transition:\n\n' +
              this
            );
          }

          userCallbacks.forEach(function(cb) {
            callbacks.push(cb);
          });
        }, this);

        return callbacks;
      },

      callbacksFor: function(name) {
        var callbacks = [];
        var fsm    = this.get('fsm');
        var target = this.get('target');
        var fn;

        if ((fn = fsm[name])) {
          callbacks.push([fsm, fn, 'fsm:' + name]);
        }

        if ((fn = target[name]) && fsm !== target) {
          callbacks.push([target, fn, name]);
        }

        return callbacks;
      },

      callback: function(name, arg0Property) {
        var arg0             = arg0Property ? this.get(arg0Property) : null;
        var promises         = {};
        var eventArgs        = this.get('eventArgs');
        var userCallbacks    = this.userCallbacksFor(name);
        var builtinCallbacks = this.callbacksFor(name);
        var transition       = this;
        var promise;

        function pushPromises(callbacks, argsTwerker) {
          var args = eventArgs.slice(0);

          argsTwerker(args);

          callbacks.forEach(function(cb) {
            var target = cb[0];
            var fn     = cb[1];

            promises[cb[2]] = withPromise(function() {
              return fn.apply(target, args);
            });
          });
        }

        pushPromises(builtinCallbacks, function(args) {
          args.insertAt(0, transition);

          if (arg0) {
            args.insertAt(0, arg0);
          }
        });

        pushPromises(userCallbacks, function(args) {
          if (arg0) {
            args.push(arg0);
          }

          args.push(transition);
        });

        promise = RSVP.hash(promises);

        promise.then(function(results) {
          delete results._setNewState_;

          transition.get('resolutions')[name] = results;
        });

        promise.catch(function(error) {
          transition.get('rejections')[name] = error;
        });

        return promise;
      },

      toString: function() {
        return (
          'Transition {' +
          '  event:      ' + this.get('event') + ',\n' +
          '  eventArgs:  ' + inspect(this.get('eventArgs')) + ',\n' +
          '  fromState:  ' + inspect(this.get('fromState')) + ',\n' +
          '  toState:    ' + inspect(this.get('toState')) + ',\n' +
          '  isResolved: ' + this.get('isResolved') + ',\n' +
          '  isRejected: ' + this.get('isRejected') + '\n' +
          '}'
        );
      }
    });
  });