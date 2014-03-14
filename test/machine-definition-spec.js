describe('FSM.MachineDefinition', function() {
  var MachineDefinition = Ember.FSM.MachineDefinition; // jshint ignore:line

  function create(args) {
    return new MachineDefinition(args);
  }

  describe('instantiation', function() {
    it('requires new operator', function() {
      expect(function() {
        MachineDefinition({ events: {} }); // jshint ignore:line
      }).toThrowError(TypeError);
    });

    it('requires an "events" property', function() {
      expect(function() {
        create({ states: {} });
      }).toThrowError(TypeError);
    });

    it('requires "events" property to be an object', function() {
      expect(function() {
        create({ events: true });
      }).toThrowError(TypeError);
    });

    it('requires "states" property to be an object if passed', function() {
      expect(function() {
        create({
          events: { },
          states: true
        });
      }).toThrowError(TypeError);
    });

    it('sets initial state to default if none specified', function() {
      var def = create({
        events: {
          poke: {
            transitions: [
              { initialized: 'annoyed' }
            ]
          }
        }
      });
      expect(def.initialState).toBe('initialized');
    });
  });

  describe('compiling events', function() {
    it('requires at least one event', function() {
      expect(function() {
        create({ events: {} });
      }).toThrowError(/at least one/);
    });
  });

  describe('explicitly defined states', function() {
    it('does not allow transitions to specify unlisted states', function() {
      expect(function() {
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
      }).toThrowError(/not a defined state/);
    });

    it('does not allow specified states to be unused', function() {
      expect(function() {
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
      }).toThrowError(/is not used/);
    });
  });

  describe('compiling transitions', function() {
    it('aliases transition to transitions', function() {
      var def = create({
        events: {
          amaze: {
            transition: { initialized: 'x' }
          }
        }
      });

      expect(def.stateNames.length).toBe(2);
      expect(def.stateNames).toContain('initialized', 'x');
    });
  });

  describe('unwinding transitions', function() {
    it('expands $all to all other known states', function() {
      var def = create({
        states: {
          initialState: 'a'
        },
        events: {
          reset: { transitions: { $all: 'a' } },
          fobble: { transitions: { x: 'a' } },
          doggle: { transitions: { y: 'b' } },
          wobble: { transitions: { z: 'c' } }
        }
      });

      var transitions = def.transitionsFor('reset');

      expect(transitions.length).toBe(6);

      transitions.forEach(function(t) {
        expect(t.toState.name).toBe('a');
      });
    });

    it('replaces $same with the state specified in fromState', function() {
      var def = create({
        events: {
          toA: {
            transitions: [
              { initialized: 'a' },
              { a: '$same' }
            ]
          }
        }
      });

      var transitions = def.transitionsFor('toA', 'a');

      expect(transitions.length).toBe(1);
      expect(transitions[0].toState.name).toBe('a');
    });

    it('allows multiple guarded transitions with the same from state', function() {
      var def = create({
        states: {
          initialState: 'off'
        },
        events: {
          run: {
            transitions: [
              { on: '$same' },
              { off: 'on', unless: 'isWarm' },
              { off: 'on', guard: 'hasPower' },
            ]
          }
        }
      });

      var transitions = def.transitionsFor('run', 'off');

      expect(transitions.length).toBe(2);

      transitions.forEach(function(t) {
        expect(t.isGuarded).toBe(true);
      });
    });

    xit('does not allow unguarded transitions with the same from state', function() {

    });
  });
});
