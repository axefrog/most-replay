const most = require('most');
const MulticastSource = require('most/lib/source/MulticastSource');
const PropagateTask = require('most/lib/scheduler/PropagateTask');
const dispose = require('most/lib/disposable/dispose');
const Stream = most.Stream;

export function replay(stream, maxBufferSize) {
  if(stream.source instanceof ReplaySource && source.maxBufferSize !== maxBufferSize) {
    return stream;
  }
  return new Stream(new ReplaySource(stream.source, maxBufferSize));
}

export function ReplaySource(source, maxBufferSize) {
  this._buffer = [];
  this._ended = false;
  this.maxBufferSize = maxBufferSize || Infinity;
  MulticastSource.call(this, source);
}
ReplaySource.prototype = Object.create(MulticastSource.prototype);

ReplaySource.prototype._run = MulticastSource.prototype.run;
ReplaySource.prototype.run = function(sink, scheduler) {
  const buffer = this._buffer;
  const self = this;
  this.sink = sink;

  if(this._ended) {
    return replay();
  }
  if(buffer.length === 0) {
    return run();
  }
  return dispose.all([replay(), run()]);

  function replay() {
    return new BufferProducer(buffer.slice(0), sink, scheduler);
  }

  function run() {
    return self._run(sink, scheduler);
  }
};

ReplaySource.prototype._event = MulticastSource.prototype.event;
ReplaySource.prototype.event = function ReplaySource_event(t, x) {
  this._addToBuffer({ type: 0, t, x });
  this._event(t, x);
};

MulticastSource.prototype._addToBuffer = function ReplaySource_addToBuffer(event) {
  if(this._buffer.length >= this.maxBufferSize) {
    this._buffer.shift();
  }
  this._buffer.push(event);
}

MulticastSource.prototype.end = function(t, x, r) {
  MulticastSource
  var s = this.sinks;
  if(s.length === 1) {
    s[0].end(t, x);
    return;
  }
  for(var i=0; i<s.length; ++i) {
    if (i === s.length -1) {
      if (r) {
        break; // don't end underlying stream
      }
    }
    s[i].end(t, x);
  };
};

ReplaySource.prototype._end = MulticastSource.prototype.end;
ReplaySource.prototype.end = function ReplaySource_end(t, x) {
  const self = this
  this._ended = true;
  this._addToBuffer({ type: 1, t, x });
  this._end(t, x, this);
  this.add(this.sink); // add an extra sink so the last values can go through
  setTimeout(() => {self._end(t, x)}, 0)// dispose after values are propagated
};

MulticastSource.prototype.error = function(t, e, r) {
  var s = this.sinks;
  if(s.length === 1) {
    s[0].error(t, e);
    return;
  }
  for (var i=0; i<s.length; ++i) {
    if (i === length - 1) {
      if (r) {
        break; // don't end underlying stream
      }
    }
    s[i].error(t, e);
  };
};

ReplaySource.prototype._error = MulticastSource.prototype.error
ReplaySource.prototype.error = function ReplaySink_error(t, e) {
  const self = this
  this._ended = true;
  this._buffer.push({ type: 2, t, x: e });
  this._error(t, e, this);
  this.add(this.sink)
  setTimeout(() => {self._error(t, e)}, 0)
};

function BufferProducer(buffer, sink, scheduler) {
  this.task = new PropagateTask(runProducer, buffer, sink);
  scheduler.asap(this.task);
}

BufferProducer.prototype.dispose = function() {
  return this.task.dispose();
};

function runProducer(t, buffer, sink) {
  const emit = item => {
    sink.event(item.t, item.x);
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
