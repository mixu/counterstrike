var util = require('util'),
    EventEmitter = require('events').EventEmitter

    unit = require('./time.js');

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function Counter(options) {
  if(!options.interval || !options.store) {
    throw new Error('Interval and store are required to construct a counter.');
  }

  // settings
  this._interval = unit.parse(options.interval);
  this._intervalInMillis = unit.convert(this._interval, 'ms');
  this._store = options.store;
  // if the store is not a number, then calculate the number from the duration
  if(!isNumber(this._store)) {
    // convert to the same unit
    this._store = unit.parse(this._store);
    var storeAmount = unit.convert( this._store, this._interval.unit);
    this._buckets = storeAmount.value / this._interval.value;
  } else {
    this._buckets = this._store;
  }

  if(options.source) {

    // since we are driven by the clock signal from the source, do not start new timers
    // and allow values to be rotated at unequal intervals
    this._unsafe = true;
    this._automatic = false;
  } else {
    // if this is set, then calls to rotate() will not check the time first (which allows for premature bucket rotation)
    this._unsafe = options.unsafe || false;
    // if this is set, then the counter takes care of rotating itself automatically by scheduling a timeout
    // if it is not set, then you need to make sure that the counter is called at least once per each duration
    this._automatic = (typeof options.automatic === 'undefined' ? true : options.automatic);
  }

  // track history as an array
  this._history = [];
  // track the rotation times to know when the values in history were recorded
  this._rotated = [];
  // timeout for next rotation
  this._timeout = null;

  this.rotate();
}

util.inherits(Counter, EventEmitter);

Counter.prototype._getCurrent = function(unit) {
  var now = new Date();
  switch(unit) {
    case 'h':
      return new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    case 'm':
      return new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
      break;
    case 's':
      return new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
    case 'ms':
      // with milliseconds, we'll try for even 10's and even 100's
      if(this._intervalInMillis % 100 == 0) {
        return new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), Math.round(now.getMilliseconds()/100)*100);
      } else if(this._intervalInMillis % 10 == 0) {
        return new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), Math.round(now.getMilliseconds()/10)*10);
      }
      return new Date();
    default:
  }
  return new Date();
}

Counter.prototype.inc = function(n) {
  this._history[0] += (arguments.length > 0 ? n : 1);
  return this._history[0];
};

Counter.prototype.get = function() {
  return this._history[0];
};

Counter.prototype.set = function(value) {
  this._history[0] = value;
  return this._history[0];
};

Counter.prototype._reset = function() {
  this._history.unshift(0);
  this._rotated.unshift(this._getCurrent(this._interval.unit));
};

// rotate the history
Counter.prototype.rotate = function() {
  if(!this._unsafe &&
      this._rotated[0] &&
      this._getCurrent(this._interval.unit).getTime() < this._rotated[0].getTime() + this._intervalInMillis) {
    // still in the same time interval, so we should not rotate
    if(this._automatic) {
      // reschedule the timer
      this._scheduleTimeout();
    }
    return false;
  }

  this.emit('rotate');

  // add a new item at the front
  this._reset();
  // remove the last item while necessary
  while(this._history.length > this._buckets) {
    this._history.pop();
    this._rotated.pop();
  }

  // schedule before rotating, so that the rotate event can cancel the timeout successfully
  if(this._automatic) {
    this._scheduleTimeout();
  }

  return true; // was rotated
};

Counter.prototype.history = function() {
  return { at: this._rotated, values: this._history };
};

Counter.prototype._scheduleTimeout = function() {
  var self = this,
      last = this._rotated[0].getTime(),
      current = new Date().getTime(),
      elapsed = current - last,
      duration = this._intervalInMillis;
  this._timeout && clearTimeout(this._timeout);
  this._timeout = setTimeout(function() {
    self.rotate();
  }, (elapsed < duration ? duration - elapsed : 0));
};

// stop the current timeout
Counter.prototype.stop = function() {
  this._timeout && clearTimeout(this._timeout);
  this._timeout = null;
  this._automatic = false;
};

// Subclass the basic counter to create a hash-based counter.
// The only difference is that the `inc`/`set`/`get` functions require a key parameter
function CounterHash(options) {
  Counter.apply(this, options);
};

// inherit from Counter
util.inherits(CounterHash, Counter);

// override the methods to work smoothly with a hash
CounterHash.prototype._reset = function() {
  this._history.unshift({});
  this._rotated.unshift(this._getCurrent(this._humanUnit));
};

CounterHash.prototype.inc = function(key, n) {
  var increment = (arguments.length > 1 ? n : 1);
  if(!this._history[0][key]) {
    this._history[0][key] = 0;
  }
  this._history[0][key] += increment;
  return this._history[0];
};

CounterHash.prototype.get = function(key) {
  return this._history[0][key];
};

CounterHash.prototype.set = function(key, value) {
  this._history[0][key] = value;
  return this._history[0][key];
};

Counter.Hash = CounterHash;

module.exports = Counter;