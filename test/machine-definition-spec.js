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
          poke: { transitions: [{ okay: 'annoyed' }] }
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
          states: { knownStates: ['farting'] },
          events: {
            shart: { transitions: [{ farting: 'soiled' }] }
          }
        });
      }).toThrowError(/not a defined state/);
    });

    it('does not allow specified states to be unused', function() {
      expect(function() {
        create({
          states: { explicitStates: ['wiggling', 'wobbling', 'farting'] },
          events: {
            wiggle: { transitions: [{ 'wiggling': 'wobbling' }] }
          }
        });
      }).toThrowError(/is not used/);
    });
  });

  describe('compiling transitions', function() {
    it('aliases transition to transitions', function() {
      var def = create({ events: { amaze: { transition: { x: 'y' } } } });
      expect(def.stateNames.length).toBe(2);
      expect(def.stateNames).toContain('x', 'y');
    });
  });

  describe('unwinding transitions', function() {
    xit('expands $all to all other known states', function() {
      var def = create({ events: {
        wiggle: { transitions: { $all: 'y' } },
        doggle: { transitions: { x: 'z' } },
        wobble: { transitions: { y: 'x' } }
      } });

      var transitions = def.transitionsFor('wiggle');
      var fromStates  = transitions.map(function(t) { return t.fromState; });

      expect(fromStates.length).toBe(3);
      expect(fromStates).toContain('x', 'y', 'z');
    });
  });
});
