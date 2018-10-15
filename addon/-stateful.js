import { reads } from '@ember/object/computed';
import Mixin from '@ember/object/mixin';
import Machine from './-machine';

export default Mixin.create({
  fsmEvents:       null,
  fsmStates:       null,
  fsmInitialState: null,
  fsmIsLoading:    reads('__fsm__.isTransitioning'),
  fsmCurrentState: reads('__fsm__.currentState'),

  init() {
    this._super(...arguments);
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
      mixin[prop] = reads('__fsm__.' + prop);
    });

    this._super.apply(this, arguments);
    this.reopen(mixin);
  },

  sendStateEvent() {
    let fsm = this.get('__fsm__');
    return fsm.send.apply(fsm, arguments);
  }
});
