import RSVP from 'rsvp';

export function startIgnoringRejections() {
  RSVP.off('error');
}

export function stopIgnoringRejections() {
}
