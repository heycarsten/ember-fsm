import Ember from 'ember';
import FSM from 'ember-fsm';

const WAIT_TIMES = {
  'red':   5000,
  'amber': 3500,
  'green': 6500
};

export default Ember.Controller.extend(FSM.Stateful, {
  fsmStates: {
    initialState: 'off',

    off: {
      didEnter: ['didPowerOff', 'notifyPowerDown'],
      willExit: 'notifyPowerUp'
    }
  },

  fsmEvents: {
    cycle: {
      after: 'colorChanged',

      transitions: [
        { off: 'red' },
        { 'red': 'green' },
        { 'green': 'amber' },
        { 'amber': 'red' }
      ]
    },

    powerDown: {
      transition: {
        from: ['red', 'green', 'amber'], to: 'off'
      }
    }
  },

  actions: {
    powerUp() {
      this.sendStateEvent('cycle');
    },

    powerDown() {
      if (this.get('isInOff')) {
        return;
      }

      this.set('doPowerDown', true);
    }
  },

  didPowerOff() {
    this.set('doPowerDown', false);
  },

  notifyPowerUp() {
    this.log('info', 'Requesting to take traffic signal online.');

    return this.sleep(3000).then(() => {
      this.log('info', 'Notified central office of power up.');
    });
  },

  notifyPowerDown() {
    this.log('info', 'Notified central office of power down.');
  },

  colorChanged(transition) {
    let ms = WAIT_TIMES[this.get('fsmCurrentState')];

    this.log('change', `${transition.fromState} -> ${transition.toState}`);

    return this.sleep(ms).then(() => {
      if (this.get('doPowerDown')) {
        this.sendStateEvent('powerDown');
      } else {
        this.sendStateEvent('cycle');
      }
    });
  },

  sleep(ms) {
    return new Ember.RSVP.Promise((resolve) => {
      Ember.run.later(this, () => {
        resolve();
      }, ms);
    });
  },

  log(level, message) {
    this.get('model.messages').pushObject({
      level: level,
      message: message
    });
  }
});
