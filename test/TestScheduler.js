var runSource = require('most/lib/runSource');
var defer = require('most/lib/defer');
var timestamp = require('most/lib/combinator/timestamp');
var base = require('most/lib/base');

var findIndex = base.findIndex;

module.exports = TestScheduler;

function ScheduledTask(delay, period, task, scheduler) {
	this.time = delay;
	this.period = period;
	this.task = task;
	this.scheduler = scheduler;
	this.active = true;
}

ScheduledTask.prototype.run = function() {
	return this.task.run(this.time);
};

ScheduledTask.prototype.error = function(e) {
	return this.task.error(this.time, e);
};

ScheduledTask.prototype.cancel = function() {
	this.scheduler.cancel(this);
	return this.task.dispose();
};

function runTask(task) {
	try {
		return task.run();
	} catch(e) {
		return task.error(e);
	}
}

function Scheduler(setTimer, clearTimer, now) {
	this.now = now;
	this._setTimer = setTimer;
	this._clearTimer = clearTimer;

	this._timer = null;
	this._nextArrival = 0;
	this._tasks = [];

	var self = this;
	this._runReadyTasksBound = function() {
		self._runReadyTasks(self.now());
	};
}

Scheduler.prototype.asap = function(task) {
	return this.schedule(0, -1, task);
};

Scheduler.prototype.delay = function(delay, task) {
	return this.schedule(delay, -1, task);
};

Scheduler.prototype.periodic = function(period, task) {
	return this.schedule(0, period, task);
};

Scheduler.prototype.schedule = function(delay, period, task) {
	var now = this.now();
	var st = new ScheduledTask(now + Math.max(0, delay), period, task, this);

	insertByTime(st, this._tasks);
	this._scheduleNextRun(now);
	return st;
};

Scheduler.prototype.cancel = function(task) {
	task.active = false;
	var i = findIndex(task, this._tasks);

	if(i >= 0) {
		this._tasks.splice(i, 1);
		this._reschedule();
	}
};

Scheduler.prototype.cancelAll = function(f) {
	this._tasks = base.removeAll(f, this._tasks);
	this._reschedule();
};

Scheduler.prototype._reschedule = function() {
	if(this._tasks.length === 0) {
		this._unschedule();
	} else {
		this._scheduleNextRun(this.now());
	}
};

Scheduler.prototype._unschedule = function() {
	this._clearTimer(this._timer);
	this._timer = null;
};

Scheduler.prototype._runReadyTasks = function(now) {
	this._timer = null;

	this._runTasks(this._collectReadyTasks(now));

	this._scheduleNextRun(this.now());
};

Scheduler.prototype._collectReadyTasks = function(now) {
	var tasks = this._tasks;
	var l = tasks.length;
	var toRun = [];

	var task, i;

	// Collect all active tasks with time <= now
	for(i=0; i<l; ++i) {
		task = tasks[i];
		if(task.time > now) {
			break;
		}
		if(task.active) {
			toRun.push(task);
		}
	}

	this._tasks = base.drop(i, tasks);

	return toRun;
};

Scheduler.prototype._runTasks = function(tasks) {
	// Run all ready tasks
	var l = tasks.length;
	var task;

	for(var i=0; i<l; ++i) {
		task = tasks[i];
		runTask(task);

		// Reschedule periodic repeating tasks
		// Check active again, since a task may have canceled itself
		if(task.period >= 0 && task.active) {
			task.time = task.time + task.period;
			insertByTime(task, this._tasks);
		}
	}
};

Scheduler.prototype._scheduleNextRun = function(now) {
	if(this._tasks.length === 0) {
		return;
	}

	var nextArrival = this._tasks[0].time;

	if(this._timer === null) {
		this._scheduleNextArrival(nextArrival, now);
	} else if(nextArrival < this._nextArrival) {
		this._unschedule();
		this._scheduleNextArrival(nextArrival, now);
	}
};

Scheduler.prototype._scheduleNextArrival = function(nextArrival, now) {
	this._nextArrival = nextArrival;
	var delay = Math.max(0, nextArrival - now);
	this._timer = this._setTimer(this._runReadyTasksBound, delay);
};

function insertByTime(task, tasks) {
	tasks.splice(findInsertion(task, tasks), 0, task);
}

function findInsertion(task, tasks) {
	var i = binarySearch(task, tasks);
	var l = tasks.length;
	var t = task.time;

	while(i<l && t === tasks[i].time) {
		++i;
	}

	return i;
}

function binarySearch(x, sortedArray) {
	var lo = 0;
	var hi = sortedArray.length;
	var mid, y;

	while (lo < hi) {
		mid = Math.floor((lo + hi) / 2);
		y = sortedArray[mid];

		if (x.time === y.time) {
			return mid;
		} else if (x.time < y.time) {
			hi = mid;
		} else {
			lo = mid + 1;
		}
	}
	return hi;
}

function TestScheduler() {
	this._time = 0;
	this._targetTime = 0;
	this._running = false;
	var s = this;
	Scheduler.call(this, void 0, void 0,
		function() { return s._time; });
}

TestScheduler.prototype = Object.create(Scheduler.prototype);

TestScheduler.prototype.collect = function(stream) {
	return this.runStream(stream).then(getEvents);
};

TestScheduler.prototype.drain = function(stream) {
	return this.runStream(stream).then(getValue);
};

TestScheduler.prototype.runStream = function(stream) {
	var s = timestamp.timestamp(stream);
	var events = [];
	return runSource.withScheduler(function(x) {
		events.push(x);
	}, s.source, this).then(function(x) {
		return { events: events, value: x };
	});
};

TestScheduler.prototype.tick = function(dt) {
	if(dt <= 0) {
		return;
	}

	return this._setNow(dt + this._time);
};

TestScheduler.prototype._setNow = function(t) {
	this._targetTime = Math.max(this._time, Math.max(this._targetTime, t));

	if(this._running) {
		return;
	}

	this._running = true;
	return this._advanceClock();
};

TestScheduler.prototype._advanceClock = function() {
	if(this._time > this._targetTime) {
		this._running = false;
		return;
	}

	return defer(new AdvanceClockTask(this));
};

TestScheduler.prototype._unschedule = function() {};

TestScheduler.prototype._scheduleNextRun = function(now) {
	if(this._tasks.length === 0 || now < this._tasks[0].time) {
		return;
	}

	this._setNow(now);
};

function AdvanceClockTask(scheduler) {
	this.scheduler = scheduler;
}

AdvanceClockTask.prototype.run = function() {
	if(this.scheduler._tasks.length === 0) {
		this.scheduler._time = this.scheduler._targetTime;
		return;
	}

	this.scheduler._time = this.scheduler._tasks[0].time;
	this.scheduler._runReadyTasks(this.scheduler._time);
	return this.scheduler._advanceClock();
};

AdvanceClockTask.prototype.error = function(e) {
	console.error(e);
};

function getEvents(result) {
	return result.events;
}

function getValue(result) {
	return result.value;
}
