describe('FSM.Stateful', function() {
  var so;
  var fsm;
  var sO;

  beforeEach(function() {
    sO = Em.Object.extend(Em.FSM.Stateful, {
      fsmStates: {
        initialState: 'cool'
      },

      fsmEvents: {
        blerp: { transition: { cool: 'herp' } }
      }
    });

    so  = sO.create();
    fsm = so.get('__fsm__');
  });

  it('sets the state machine target to the includer', function() {
    expect(so).toBe(fsm.get('target'));
  });

  it('provides fsmCurrentState', function() {
    expect(so.get('fsmCurrentState')).toBe('cool');
  });

  it('can override the initial state', function() {
    so = sO.create({fsmInitialState: 'herp'});
    expect(so.get('fsmCurrentState')).toBe('herp');
  });

  it('provides fsmIsLoading', function() {
    expect(so.get('fsmIsLoading')).toBe(false);
    fsm.pushActiveTransition('t0');
    expect(so.get('fsmIsLoading')).toBe(true);
  });

  it('provides isIn{{State}} accessors', function() {
    expect(so.get('isInCool')).toBe(true);
    expect(so.get('isInHerp')).toBe(false);
  });

  it('delegates sendStateEvent to fsm.send', function(done) {
    so.sendStateEvent('blerp').then(function() {
      Em.run.next(function() {
        expect(so.get('fsmCurrentState')).toBe('herp');
        done();
      });
    });
  });
});
