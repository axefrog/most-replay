const most = require('most');
const assert = require('chai').assert;
const Scheduler = require('most/lib/scheduler/Scheduler');
require('../lib/extend');

function sequence(length) {
  const arr = [];
  for(var i = 0; i < length; i++) {
    arr.push(i);
  }
  return arr;
}

function sink(f, end, err) {
  return {
    event: f||(() => {}),
    end: end||(() => {}),
    error: err||(() => {})
  };
}

function makeScheduler() {
  var t = 0, id = 0;
  const timers = {};
  function setTimer(f, ms) {
    const k = id++;
    timers[id] = { f, ms: t + ms };
  }
  function clearTimer(id) {
    delete timers[id];
  }
  function now() {
    return t;
  }
  function flush() {
    for(let key of Object.keys(timers)) {
      const timer = timers[key];
      if(timer.ms <= t) {
        delete timers[key];
        timer.f();
      }
    }
  }
  function tick(n) {
    t += n;
    flush();
  }
  const scheduler = new Scheduler(setTimer, clearTimer, now);
  scheduler.tick = tick;
  scheduler.collect = function(stream) {

    const events = [];
    return new Promise((resolve, fail) => {
      source.run(sink(x => events.push(x), resolve, fail), scheduler);
    });
  }
}

function isEventChar(s) {
  const k = s.charCodeAt(0);
  // allow [A-Za-z0-9];
  return (k >= 97 && k <= 122) || (k >= 65 && k <= 90) || (k >= 48 && k <= 57);
}

function eventType(s) {
  return isEventChar(s) ? 'event' :
    s === '-' ? 'idle' :
    s === '|' ? 'end' :
    s === '#' ? 'error'
    : null;
}

function toEvent(s, t) {
  const type = eventType(s);
  const event = { type, t };
  switch(type) {
    case 'event':
      event.value = s;
  }
  if(type === 'event') event.value = s;
  return event;
}

function parse(plan) {
  const events = [];
  let t = 0;
  plan.reduce((acc, s) => acc.concat(), [])
  for(let i = 0; i < plan.length; i++) {
    const s = plan[i];
    if(isEventChar(s))
    events.push(
      isEventChar(s) ? { type: 'event', t: i } :
      s === '-' ? 'idle' :
      s === '|' ? 'end' :
      s === '#' ? 'error'
      : null
    );
  }
}

function hot(plan) {

}

function cold(plan) {

}

function run(f) {
  const plan = [];
  const context = {
    stream(s) {
      plan.push({ type:'stream', stream:s });
    },
    tick(n) {
      plan.push({ type:'tick', ms:n });
    }
  };
  f(plan);
  const events = [];
  const scheduler = makeScheduler();
  plan.forEach(item => {
    switch(item.type) {
      case 'stream':
        source.run(sink(x => events.push({ a: x })), scheduler);
        break;
    }
  })
}

describe('Replay', () => {
  it('should exist as a stream operator', () => {
    const stream = most.just(0);
    assert.isFunction(stream.replay);
  });

  it('should behave transparently for the first observer', done => {
    const append = (a, x) => a.concat(x);
    const size = 5;
    const s = most.iterate(function(x) { return x+1; }, 0).take(size).multicast();

    var $ = most.iterate(function(x) { return x+1; }, 0).take(5).replay();

    function foo() {
      $.map(() => $.reduce(append, []))
      .reduce(append, [])
      .then(function(arrayOfPromises) { return Promise.all(arrayOfPromises); })
      .then(function(arrayOfArrays) {
        console.log(arrayOfArrays);
        // all arrays should be identical with replay,
        // but different without it
      });
    };
    foo();
    // setTimeout(foo, 1);

    // most.from(sequence(size))
    //   .map(function() { return s.reduce(append, []); })
    //   .reduce(append, [])
    //   .then(arrayOfPromises => Promise.all(arrayOfPromises))
    //   .then(function(arrayOfArrays) {
    //     assert.lengthOf(arrayOfArrays, 5);
    //     assert.lengthOf(arrayOfArrays[0], 5);
    //     try {
    //       for(var i = 1; i < arrayOfArrays.length; i++) {
    //         const arr1 = arrayOfArrays[i-1];
    //         const arr2 = arrayOfArrays[i];
    //         assert.deepEqual(arr1, arr2, `array #${i-1} [${arr1}] not equal to array #${i} [${arr2}]`);
    //       }
    //       console.log('Output:', arrayOfArrays);
    //       done();
    //     }
    //     catch(e) {
    //       throw e;
    //     }
    //     // all arrays should be identical with replay,
    //     // but different without it
    //   });
  });
});
