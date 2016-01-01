const Scheduler = require('most/lib/scheduler/Scheduler');
const Observer = require('most/lib/sink/Observer');
const Promise = require('most/lib/Promise');
const SettableDisposable = require('most/lib/disposable/SettableDisposable');

export function sink(f, end, err) {
  return {
    event: f||(() => {}),
    end: end||(() => {}),
    error: err||(() => {})
  };
}

export function TestScheduler() {
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
    t += (n||1);
    flush();
  }

  // for(let key of Object.keys(Scheduler.prototype)) {
  //   console.log('KEY', key)
  //   const f = Scheduler.prototype[key];
  //   if(typeof f === 'function') {
  //     Scheduler.prototype[key] = function() {
  //       console.log('Scheduler.' + key);
  //       return f.call(this, ...arguments);
  //     }
  //   }
  // }

  const scheduler = new Scheduler(setTimer, clearTimer, now);
  scheduler.tick = tick;
  scheduler.collect = function(stream) {
    const events = [];
    return new Promise((resolve, fail) => {
      source.run(sink(x => events.push(x), () => resolve(events), fail), scheduler);
    });
  };

  return scheduler;
}

export function withScheduler(f, source, scheduler) {
	return new Promise(function (resolve, reject) {
		var disposable = new SettableDisposable();
		var observer = new Observer(f, resolve, reject, disposable);
		disposable.setDisposable(source.run(observer, scheduler));
	});
}

export function observe(stream, scheduler, f) {
  var i = 0;
  const emit = x => f(x, i++);
  withScheduler(emit, stream.source, scheduler);
  return scheduler;
}
