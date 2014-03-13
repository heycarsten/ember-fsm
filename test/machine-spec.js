describe('FSM.Machine', function() {
  var Machine = Ember.FSM.Machine;

  function create(stateEvents) {
    if (!stateEvents) {
      stateEvents = {
        eventOne: { transitions: [{
          from: 'old', to: 'new',
          before: 'beforeCallback',
          willExit: 'willExitCallback',
          didExit: 'didExitCallback',
          willEnter: 'willEnterCallback',
          didEnter: 'didEnterCallback',
          after: 'afterCallback'
        }] }
      };
    }
    return Machine.create({ stateEvents: stateEvents });
  }

  it('has an initial state of initialized', function() {
    expect(create().get('initialState')).toBe('initialized');
  });

  it('must be initialized with stateEvents', function() {
    expect(Machine.create).toThrow();
  });
});
