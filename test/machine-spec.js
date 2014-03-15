describe('FSM.Machine', function() {
  function create(args) {
    return Ember.FSM.Machine.create(args);
  }

  describe('Creation', function() {
    it('adds a default error event and finished state if none is provided', function() {
      var m = create({
        events: {
          one: { transitions: { initialized: 'a' } }
        }
      });

      expect(m.get('stateNames')).toContain('failed');
      expect(m.get('eventNames')).toContain('error');
    });

    it('does not add default error event if one is provided by the user', function() {
      var m = create({
        events: {
          one: { transition: { initialized: 'a' } },
          error: { transition: { a: 'broken' } }
        }
      });

      expect(m.get('stateNames')).not.toContain('failed');
    });

    it('sets the currentState to the initialState', function() {
      var m = create({
        states: { initialState: 'ready' },
        events: { one: {transition: { ready: 'a' } } }
      });

      expect(m.get('currentState')).toBe('ready');
    });
  });
});
