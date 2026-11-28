'use strict';

function createStartupReadiness() {
  let state = 'starting';
  return {
    // A failed initial restore cannot be declared complete by a later DB ping.
    // The supported recovery is a controlled restart with a healthy database.
    complete(success) {
      if (state !== 'failed') state = success === true ? 'ready' : 'failed';
    },
    fail() { state = 'failed'; },
    status() { return state; }
  };
}

module.exports = { ...createStartupReadiness(), createStartupReadiness };
