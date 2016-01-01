const most = require('most');
const MulticastSource = require('most/lib/source/MulticastSource');
const PropagateTask = require('most/lib/scheduler/PropagateTask');
const CompoundDisposable = require('most/lib/disposable/CompoundDisposable');
const Stream = most.Stream;

export function replay(stream) {
  if(stream.source instanceof ReplaySource) {
    return stream;
  }
  return new Stream(new ReplaySource(stream.source));
}

export function ReplaySource(source) {
  this._buffer = [];
  this._ended = false;
  MulticastSource.call(this, source);
}
ReplaySource.prototype = Object.create(MulticastSource.prototype);

ReplaySource.prototype._run = MulticastSource.prototype.run;
ReplaySource.prototype.run = function(sink, scheduler) {
  const buffer = this._buffer;
  const self = this;

  if(this._ended) {
    return replay();
  }
  if(buffer.length === 0) {
    return run();
  }

  return new CompoundDisposable([replay(), run()]);

  function replay() {
    return new BufferProducer(buffer.slice(0), sink, scheduler);
  }

  function run() {
    return self._run(sink, scheduler);
  }
};

ReplaySource.prototype._event = MulticastSource.prototype.event;
ReplaySource.prototype.event = function ReplaySource_event(t, x) {
  this._buffer.push({ type: 0, t, x });
  this._event(t, x);
};

ReplaySource.prototype._end = MulticastSource.prototype.end;
ReplaySource.prototype.end = function ReplaySource_end(t, x) {
  this._buffer.push({ type: 1, t, x });
  this._end(t, x);
  this._ended = true;
};

ReplaySource.prototype._error = MulticastSource.prototype.error;
ReplaySource.prototype.error = function ReplaySink_error(t, e) {
  this._buffer.push({ type: 2, t, x: e });
  this._error(t, e);
  this._ended = true;
};

function BufferProducer(buffer, sink, scheduler) {
  console.log('new buffer producer for', buffer.map(x => x.x))
  this.scheduler = scheduler;
  this.task = new PropagateTask(runProducer, buffer, sink);
  scheduler.asap(this.task);
}

BufferProducer.prototype.dispose = function() {
  console.log('disposing')
  return this.task.dispose();
};

function runProducer(t, buffer, sink) {
  console.log('run producer for', buffer.map(x => x.x))
  const emit = item => {
    console.log('emitting:', item.x*10+5)
    sink.event(item.t, item.x*10+5);
  }
  for(var i=0, j=buffer.length; i<j && this.active; i++) {
    const item = buffer[i];
    switch(item.type) {
      case 0: emit(item); break;
      case 1: return this.active && sink.end(item.t, item.x);
      case 2: return this.active && sink.error(item.t, item.x);
    }
  }
}