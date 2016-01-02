const most = require('most');
const assert = require('chai').assert;
require('../lib/extend');

import {TestScheduler, sink, observe} from './utils';

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
      .then(arrayOfPromises => Promise.all(arrayOfPromises))
      .then(function(arrayOfArrays) {
        arrayOfArrays.reduce((prev, curr) => {
          assert.deepEqual(prev, curr);
          return curr;
        })
        done();
      });
  });
});
