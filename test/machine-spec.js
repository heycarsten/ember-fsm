describe('FSM.Machine', function() {
  describe('create', function() {
    it('adds a default error event and finished state if none is provided', function() {
      var fsm = createMachine({
        events: {
          one: { transitions: { initialized: 'a' } }
        }
      });

      expect(fsm.get('stateNames')).toContain('failed');
      expect(fsm.get('eventNames')).toContain('error');
    });

    it('does not add default error event if one is provided by the user', function() {
      var fsm = createMachine({
        events: {
          one: { transition: { initialized: 'a' } },
          error: { transition: { a: 'broken' } }
        }
      });

      expect(fsm.get('stateNames')).not.toContain('failed');
    });

    it('sets the currentState to the initialState', function() {
      var fsm = createMachine({
        states: { initialState: 'ready' },
        events: { one: { transition: { ready: 'a' } } }
      });

      expect(fsm.get('currentState')).toBe('ready');
    });
  });

  describe('transitionFor', function() {
    it('selects a transition based off the current state', function() {
      var fsm = createBasicMachine();
      var t   = fsm.transitionFor('run');

      expect(t.constructor).toBe(Ember.FSM.Transition);
      expect(t.toState).toBe('active.running');
    });

    it('considers guards when selecting a transition', function() {
      var fsm = createBasicMachine({
        states: {
          initialState: 'active.running'
        },
        atMaxSpeed: true
      });

      expect(fsm.get('currentState')).toBe('active.running');
      expect(fsm.transitionFor('trip').toState).toBe('injured');

      fsm.set('atMaxSpeed', false);

      expect(fsm.transitionFor('trip').toState).toBe('inactive');
    });
  });

  describe('inState', function() {
    it('throws an error if the passed state name does not exist', function() {
      var fsm = createBasicMachine();

      expect(function() {
        fsm.inState('herp');
      }).toThrowError(/no states or substates/);
    });

    it('returns true for namespace match', function() {
      var fsm = createBasicMachine({
        states: { initialState: 'active.running' }
      });

      expect(fsm.get('currentState')).toBe('active.running');
      expect(fsm.inState('active')).toBe(true);
      expect(fsm.inState('active.running')).toBe(true);
      expect(fsm.inState('inactive')).toBe(false);
    });

    it('returns true for a state match', function() {
      var fsm = createBasicMachine();
      expect(fsm.inState('inactive')).toBe(true);
    });
  });

  describe('is{{stateName}} accessors', function() {
    it('returns true if it matches the current state', function() {
      var fsm = createBasicMachine();

      expect(fsm.get('currentState')).toBe('inactive');
      expect(fsm.get('isInactive')).toBe(true);
      expect(fsm.get('isActiveRunning')).toBe(false);
    });

    it('returns true if it matches the current state namespace', function() {
      var fsm = createBasicMachine();

      fsm.set('currentState', 'active.running');

      expect(fsm.get('currentState')).toBe('active.running');
      expect(fsm.get('isActive')).toBe(true);
      expect(fsm.get('isActiveRunning')).toBe(true);
      expect(fsm.get('isInactive')).toBe(false);
    });

    it('is invalidated when the current state changes', function() {
      var fsm = createBasicMachine();
      expect(fsm.get('isInactive')).toBe(true);

      fsm.set('currentState', 'active.running');
      expect(fsm.get('isInactive')).toBe(false);

      fsm.set('currentState', 'inactive');
      expect(fsm.get('isInactive')).toBe(true);
    });
  });

  describe('canEnterState', function() {
    it('returns true if the requested state can be entered from the current state on any event', function() {
      var fsm = createBasicMachine();

      expect(fsm.get('currentState')).toBe('inactive');

      expect(fsm.canEnterState('active.running')).toBe(true);
      expect(fsm.canEnterState('injured')).toBe(false);

      fsm.set('currentState', 'active.running');
      fsm.set('atMaxSpeed', true);

      expect(fsm.canEnterState('injured')).toBe(true);
    });
  });

  describe('send', function() {
    var target = {
      canDoThing: function() {
        return true;
      },

      yellAtWale: function() {
      }
    };

    describe('with provided target', function() {

    });
  });
});
