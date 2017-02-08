import Ember from 'ember';
import Machine from './-machine';

const { Mixin, computed } = Ember;

export default Mixin.create({
  fsmEvents:       null,
  fsmStates:       null,
  fsmInitialState: null,
  fsmIsLoading:    computed.reads('__fsm__.isTransitioning'),
  fsmCurrentState: computed.reads('__fsm__.currentState'),

  init() {
    let params = {};
    let mixin  = {};
    let fsm;

    params.target = this;
    params.events = this.get('fsmEvents');
    params.states = this.get('fsmStates');
    params.initialState = this.get('fsmInitialState');

    fsm = Machine.create(params);

    this.set('__fsm__', fsm);

    fsm.isInStateAccessorProperties.forEach(function(prop) {
      mixin[prop] = computed.reads('__fsm__.' + prop);
    });

    this._super.apply(this, arguments);
    this.reopen(mixin);
  },

  sendStateEvent() {
    let fsm = this.get('__fsm__');
    return fsm.send.apply(fsm, arguments);
  }
});
