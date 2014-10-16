import { Mixin, required, computed } from 'ember';
import Machine from './machine';

export default Mixin.create({
  fsmEvents:    required(),
  fsmStates:    null,
  initialState: null,
  isLoading:    computed.oneWay('__fsm__.isTransitioning'),
  currentState: computed.oneWay('__fsm__.currentState'),

  init: function() {
    var params = {};
    var mixin  = {};
    var fsm;

    params.target = this;
    params.events = this.get('fsmEvents');
    params.states = this.get('fsmStates');
    params.initialState = this.get('initialState');

    fsm = Machine.create(params);

    this.set('__fsm__', fsm);

    fsm.isInStateAccessorProperties.forEach(function(prop) {
      mixin[prop] = computed.oneWay('__fsm__.' + prop);
    });

    this.reopen(mixin);

    this._super();
  },

  sendStateEvent: function() {
    var fsm = this.get('__fsm__');
    return fsm.send.apply(fsm, arguments);
  }
});
