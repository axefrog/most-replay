const most = require('most');
const assert = require('chai').assert;
const Scheduler = require('most/lib/scheduler/Scheduler');
require('../lib/extend');

function sink(f, end, err) {
  return {
    event: f||(() => {}),
    end: end||(() => {}),
    error: err||(() => {})
  };
}

describe('Replay', () => {
  it('should exist as a stream operator', () => {
    const stream = most.just(0);
    assert.isFunction(stream.replay);
  });

  it('should behave transparently for the first observer', done => {
    const append = (a, x) => a.concat(x);
    const size = 5;
    const stream = most.iterate(function(x) { return x+1; }, 0).take(size).replay();

    stream.map(() => stream.reduce(append, []))
      .reduce(append, [])
      .then(function(arrayOfPromises) { return Promise.all(arrayOfPromises); })
      .then(function(arrayOfArrays) {
        console.log(arrayOfArrays);
        // all arrays should be identical with replay,
        // but different without it
      });
  });
});
