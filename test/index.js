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
    const size = 3;
    const stream = most.iterate(function(x) { return x + 1; }, 0).take(size).multicast(); //.replay();
    // const stream = most.from([0,1,2])
    const scheduler = TestScheduler();
    observe(stream, scheduler, (x, i) => {
      if(i === 0) observe(stream, scheduler, x => console.log('(B) observed:', x));
      if(i === 1) observe(stream, scheduler, x => console.log('(C) observed:', x));
      console.log('(A) observed:', x);
    });

    scheduler.tick(100);
    
    // scheduler.tick();
    // scheduler.tick();
    // scheduler.tick();
    // scheduler.tick();
    // scheduler.tick();
    // const scheduler = makeScheduler();
    // scheduler.tick();
    // console.log('START')
    // stream.source.run(sink(x => {
    //   console.log('REPLAY', arguments[0]);
    // }), scheduler);
    // scheduler.collect(stream).then(x => {
    //   console.log('final', x);
    // });
    // scheduler.tick();

    // stream.observe(x => {
    //   console.log('A', x);
    //   stream.observe(x => {
    //     console.log('B', x);
    //     stream.observe(x => {
    //       console.log('C', x);
    //     });
    //   });
    // });
    // stream.map(() => stream.scan(append, []).drain())
    //  .multicast()
    //  .reduce(append, [])
    //  .then(function(arrayOfPromises) { return Promise.all(arrayOfPromises); })
    //  .then(function(arrayOfArrays) {
    //    console.log('!', arrayOfArrays)
    //    arrayOfArrays.reduce((prev, curr) => {
    //      assert.deepEqual(prev, curr);
    //      return curr;
    //    });
    //    done();
    //  });

    // stream.map(() => stream.reduce(append, []))
    //   .reduce(append, [])
    //   .then(function(arrayOfPromises) { return Promise.all(arrayOfPromises); })
    //   .then(function(arrayOfArrays) {
    //     console.log(arrayOfArrays);
    //     stream.reduce(append, []).then(arr => console.log(arr));
    //     // all arrays should be identical with replay,
    //     // but different without it
    //   });
  });
});
