var FSM = Ember.FSM;

describe('FSM.reject', function() {
  it('is a function', function() {
    expect(typeof FSM.reject).toBe('function');
  });

  it('throws an error when called', function() {
    expect(FSM.reject).toThrow();
  });
});
