var FSM = Ember.FSM;

describe('FSM', function() {
  it('should exist', function() {
    expect(FSM ? true : false).toBe(true);
  });

  it('can reject', function() {
    expect(typeof FSM.reject).toBe('function');
  })
});
