import { Definition } from 'ember-fsm';
import { module, test } from 'qunit';

function create(args) {
  return new Definition(args);
}

function build(transitions) {
  return create({
    states: { initialState: 'a' },
    events: { run: { transitions: transitions } }
  }).transitionsFor('run');
}

module('Unit: ember-fsm/-definition', function() {
  test('Instantiation', function(assert) {
    assert.throws(function() {
      Definition({ events: {} }); // jshint ignore:line
    }, TypeError, 'requires new operator be used');

    assert.throws(function() {
      create({ states: { }});
    }, TypeError, 'requires an "events" property');

    assert.throws(function() {
      create({ events: true });
    }, TypeError, 'requires "events" property to be an object');

    assert.throws(function() {
      create({ events: {}, states: true });
    }, TypeError, 'requires "states" property to be an object (if passed)');

    assert.strictEqual(create({
      events: {
        poke: {
          transitions: [
            { initialized: 'annoyed' }
          ]
        }
      }
    }).initialState, 'initialized', 'initial state is set to default if not provided');

    assert.throws(function() {
      create({ events: {} });
    }, /at least one/, 'requires at least one event');
  });

  test('Explicitly defined states', function(assert) {
    assert.throws(function() {
      create({
        states: {
          knownStates: ['initialized', 'farting']
        },
        events: {
          fart: {
            transitions: { initialized: 'farting' }
          },
          shart: {
            transitions: { farting: 'soiled' }
          }
        }
      });
    }, /not a defined state/, 'does not allow transitions to specify unlisted states');

    assert.throws(function() {
      create({
        states: {
          initialState: 'wiggling',
          explicitStates: ['wiggling', 'wobbling', 'farting']
        },
        events: {
          wiggle: {
            transitions: [
              { wiggling: 'wobbling' }
            ]
          }
        }
      });
    }, /is not used/, 'does not allow specified states to be unused');
  });
});

module('Unit: ember-fsm/-definition - compilation', function() {
  test('state callbacks', function(assert) {
    let def = create({
      states: {
        initialized: {
          willEnter: 'barkLikeDog',
          willExit:  ['sadface', 'eatMemory']
        }
      },
      events: {
        run: {
          transitions: { initialized: 'hihihi' }
        }
      }
    });

    let s = def.lookupState('initialized');

    assert.deepEqual(s.willEnter, ['barkLikeDog'], 'tracks callbacks');
    assert.deepEqual(s.willExit, ['sadface', 'eatMemory'], 'tracks callbacks');
  });

  test('aliases "transition" to "transitions"', function(assert) {
    let def = create({
      events: {
        amaze: {
          transition: { initialized: 'x' }
        }
      }
    });

    assert.strictEqual(def.stateNames.length, 2);
    assert.deepEqual(def.stateNames, ['x', 'initialized']);
  });
});

module('Unit: ember-fsm/-definition - Unwinding transitions', function() {
  test('$all macro', function(assert) {
    let def = create({
      states: {
        initialState: 'a'
      },
      events: {
        reset: { transitions: { $all: 'a' } },
        fobble: { transitions: { a: 'x' } },
        doggle: { transitions: { a: 'y' } },
        wobble: { transitions: { a: 'z' } }
      }
    });

    ['a', 'x', 'y', 'z'].forEach((fromState) => {
      let t = def.transitionsFor('reset', fromState);
      assert.strictEqual(t.length, 1, 'expands $all to all other known states');
      assert.strictEqual(t[0].fromState, fromState, 'expands $all to all other known states');
    });
  });

  test('$same macro', function(assert) {
    let def = create({
      events: {
        toA: {
          transitions: [
            { initialized: 'a' },
            { a: '$same' }
          ]
        }
      }
    });

    let t = def.transitionsFor('toA', 'a');

    assert.strictEqual(t.length, 1, 'replaces $same with the state specified in fromState');
    assert.strictEqual(t[0].toState, 'a', 'replaces $same with the state specified in fromState');
  });

  test('$initial macro (replaces $initial with initial state)', function(assert) {
    let def = create({
      states: {
        $initial: {
          willEnter: 'sayHello'
        }
      },
      events: {
        one: { transition: { $initial: 'a' } },
        two: { transition: { a: '$initial', willEnter: 'waveHello' } }
      }
    });

    let t0 = def.transitionsFor('one', '$initial');
    let t1 = def.transitionsFor('two', 'a');
    let s  = def.lookupState('$initial');

    assert.strictEqual(t0.length, 1);
    assert.strictEqual(t0[0].toState, 'a');
    assert.strictEqual(t1.length, 1);
    assert.strictEqual(t1[0].toState, 'initialized');
    assert.deepEqual(t1[0].willEnter, ['waveHello']);
    assert.strictEqual(s.willEnter.length, 1);
    assert.strictEqual(s.willEnter[0], 'sayHello');
  });

  test('allows multiple guarded transitions with the same from state', function(assert) {
    let def = create({
      states: { initialState: 'off' },
      events: {
        run: {
          transitions: [
            { on: '$same' },
            { off: 'on', unless: 'isWarm' },
            { off: 'on', guard: 'hasPower' },
            { off: 'off' }
          ]
        }
      }
    });

    let t = def.transitionsFor('run', 'off');

    assert.strictEqual(t.length, 3);
    assert.strictEqual(t[0].isGuarded, true);
    assert.strictEqual(t[0].doUnless, 'isWarm');
    assert.strictEqual(t[1].isGuarded, true);
    assert.strictEqual(t[1].doIf, 'hasPower');
    assert.strictEqual(t[2].isGuarded, false);
  });

  test('validations', function(assert) {
    assert.throws(function() {
      create({
        states: { initialState: 'off' },
        events: {
          run: {
            transitions: [
              { on: '$same' },
              { off: 'on', unless: 'isWarm' },
              { off: 'on', guard: 'hasPower' },
              { off: 'off' },
              { off: 'fail' }
            ]
          }
        }
      });
    }, /more than one/, 'allows no more than one guarded transition with the same from state');

    assert.throws(function() {
      create({
        events: {
          pedal: {
            transitions: {
              'initialized':    'mounting',
              'mounting':       'moving.slowly',
              'moving.slowly':  'moving.quickly',
              'moving.quickly': '$same'
            }
          }
        }
      });
      // The reason why is that the order of object properties isn't guarenteed
      // and it's vital that transition order is maintained
    }, /only one .+ per object/, 'does not allow multiple transitions per transition definition');

    assert.throws(function() {
      create({
        states: { initialState: 'off' },
        events: {
          run: {
            transitions: [
              { on: '$same' },
              { off: 'on' },
              { off: 'on' }
            ]
          }
        }
      });
    }, /more than one/, 'does not allow unguarded transitions with the same from state');
  });

  test('Unwinding transitions - tracks potential exit transitions for each state', function(assert) {
    let def = create({
      states: { initialState: 'a' },
      events: {
        one: {
          transition: { a: 'b' }
        },

        two: {
          transition: { a: 'b' }
        }
      }
    });

    let a = def.lookupState('a');

    assert.strictEqual(a.exitTransitions.length, 2);
    assert.strictEqual(a.exitTransitions[0].toState, 'b');
    assert.strictEqual(a.exitTransitions[0].event, 'one');
    assert.strictEqual(a.exitTransitions[1].toState, 'b');
    assert.strictEqual(a.exitTransitions[1].event, 'two');
  });

  test('tracks potential entry transitions for each state', function(assert) {
    let def = create({
      states: { initialState: 'a' },
      events: {
        one: {
          transition: { b: 'a' }
        },

        two: {
          transition: { c: 'a' }
        }
      }
    });

    let a = def.lookupState('a');
    let b = def.lookupState('b');

    assert.strictEqual(a.enterTransitions.length, 2);
    assert.strictEqual(a.enterTransitions[0].fromState, 'b');
    assert.strictEqual(a.enterTransitions[0].event, 'one');
    assert.strictEqual(a.enterTransitions[1].fromState, 'c');
    assert.strictEqual(a.enterTransitions[1].event, 'two');
    assert.strictEqual(b.exitTransitions[0].toState, 'a');
    assert.strictEqual(b.enterTransitions.length, 0);
  });
});

module('Unit: ember-fsm/-definition - Unwound transitions', function() {
  test('sets array properties to be arrays', function(assert) {
    let t = build([
      { a: 'b', before: 'doTing' },
      { d: 'e', willEnter: 'doTing' },
      { f: 'g', didEnter: 'doTing' },
      { h: 'i', willExit: 'doTing' },
      { j: 'k', didExit: 'doTing' },
      { b: 'c', after: 'doTing' }
    ]);

    assert.deepEqual(t[0].beforeEvent, ['doTing']);
    assert.deepEqual(t[1].willEnter, ['doTing']);
    assert.deepEqual(t[2].didEnter, ['doTing']);
    assert.deepEqual(t[3].willExit, ['doTing']);
    assert.deepEqual(t[4].didExit, ['doTing']);
    assert.deepEqual(t[5].afterEvent, ['doTing']);
  });

  test('passes through non-array properties', function(assert) {
    let t = build([
      { a: 'b', guard: 'hasTing' },
      { b: 'c', unless: 'hasTing' }
    ]);

    assert.strictEqual(t[0].doIf, 'hasTing');
    assert.strictEqual(t[1].doUnless, 'hasTing');
  });

  test('allows fromStates and toState to be passed as named properties', function(assert) {
    let t = build({ from: 'a', to: 'b' });

    assert.strictEqual(t[0].fromState, 'a');
    assert.strictEqual(t[0].toState, 'b');
  });


  test('allows multiple fromStates to be specified in one transition', function(assert) {
    let t = build({ from: ['a', 'b'], to: 'c' });

    assert.strictEqual(t.length, 2);
    assert.strictEqual(t[0].fromState, 'a');
    assert.strictEqual(t[0].toState, 'c');
    assert.strictEqual(t[1].fromState, 'b');
    assert.strictEqual(t[1].toState, 'c');
  });
});

module('Unit: ember-fsm/-definition - Public API', function() {
  let fsmDef = create({
    events: {
      one: {
        transitions: { initialized: 'a' }
      },

      two: {
        transitions: { a: 'b' }
      },

      three: {
        transitions: [
          { b: 's1' },
          { s1: 's1.sub1' },
          { 's1.sub1': 's1.sub2' },
          { 's1.sub2': 's1.sub2.sub1' },
          { 'ns.s1': 'ns.s2' }
        ]
      }
    }
  });

  test('provides eventNames', function(assert) {
    assert.strictEqual(fsmDef.eventNames.length, 3);
    assert.deepEqual(fsmDef.eventNames, ['one', 'two', 'three']);
  });

  test('provides events', function(assert) {
    assert.strictEqual(fsmDef.events.length, 3);
    assert.deepEqual(fsmDef.events.map((e) => e.name), ['one', 'two', 'three']);
  });

  test('provides stateNames', function(assert) {
    assert.strictEqual(fsmDef.stateNames.length, 9);
    assert.deepEqual(fsmDef.stateNames, [
      'a', 'initialized', 'b', 's1', 's1.sub1', 's1.sub2',
      's1.sub2.sub1', 'ns.s2', 'ns.s1'
    ]);
  });

  test('provides states', function(assert) {
    assert.strictEqual(fsmDef.states.length, 9);
    assert.deepEqual(fsmDef.states.map((s) => s.name), [
      'a', 'initialized', 'b', 's1', 's1.sub1', 's1.sub2',
      's1.sub2.sub1', 'ns.s2', 'ns.s1'
    ]);
  });

  test('can look up a state by name', function(assert) {
    assert.deepEqual(fsmDef.lookupState('a').name, 'a');
  });

  test('throws an error if requested to look up a state that doesn\'t exist', function(assert) {
    assert.throws(function() {
      fsmDef.lookupState('herp');
    }, /is not defined/);
  });

  test('can look up states by prefix', function(assert) {
    assert.strictEqual(fsmDef.lookupStates('s1').length, 4);
  });

  test('can look up states by namespace', function(assert) {
    assert.strictEqual(fsmDef.lookupStates('ns').length, 2);
  });

  test('throws an error if requested to lookup a state or prefix with no result', function(assert) {
    assert.throws(function() {
      fsmDef.lookupStates('herp');
    }, /no states or substates defined/);
  });

  test('knows that namespaces are not states', function(assert) {
    assert.throws(function() {
      fsmDef.lookupState('ns');
    }, /is not defined/);
  });

  test('provides a list of state prefixes', function(assert) {
    assert.deepEqual(fsmDef.stateNamespaces, ['s1', 's1.sub2', 'ns']);
  });

  test('can look up events by name', function(assert) {
    assert.strictEqual(fsmDef.lookupEvent('one').name, 'one');
  });

  test('can look up transitions by event', function(assert) {
    assert.strictEqual(fsmDef.transitionsFor('one').length, 1);
  });

  test('can look up transitions by event and starting state', function(assert) {
    assert.strictEqual(fsmDef.transitionsFor('one', 'initialized').length, 1);
    assert.strictEqual(fsmDef.transitionsFor('one', 'b').length, 0);
  });
});
