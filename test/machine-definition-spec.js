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
          states: { explicit: ['farting'] },
          events: {
            shart: { transitions: [{ farting: 'soiled' }] }
          }
        });
      }).toThrowError(/not a defined state/);
    });

    it('does not allow specified states to be unused', function() {
      expect(function() {
        create({
          states: { explicit: ['wiggling', 'wobbling', 'farting'] },
          events: {
            wiggle: { transitions: [{ 'wiggling': 'wobbling' }] }
          }
        });
      }).toThrowError(/is not used/);
    });
  });
});
