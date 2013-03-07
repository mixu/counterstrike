var sizes = {
  hour: 60 * 60 * 1000,
  minute: 60 * 1000,
  second: 1000,
  millisecond: 1
};

function Counter(options) {
  // settings
  this._humanUnit = options.unit;
  this._unit = sizes[options.unit];
  this._duration = options.duration;
  this._buckets = options.buckets;
  // if this is set, then calls to rotate() will not check the time first (which allows for premature bucket rotation)
  this._unsafe = options.unsafe || false;
  // if this is set, then the counter takes care of rotating itself automatically by scheduling a timeout
  // if it is not set, then you need to make sure that the counter is called at least once per each duration
  this._automatic = options.automatic || true;

  // track history as an array
  this._history = [];
  // track the rotation times to know when the values in history were recorded
  this._rotated = [];
  // timeout for next rotation
  this._timeout = null;

  this.rotate();
}

Counter.prototype._getCurrent = function(unit) {
  var now = new Date();
  switch(unit) {
    case 'hour':
      return new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    case 'minute':
      return new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
      break;
    case 'second':
      return new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
    case 'millisecond':
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

// rotate the history
Counter.prototype.rotate = function() {
  if(!this._unsafe &&
      this._rotated[0] &&
      this._getCurrent(this._humanUnit).getTime() < this._rotated[0].getTime() + this._duration * this._unit) {
   // still in the same time interval, so we should not rotate
    if(this._automatic) {
      // reschedule the timer
      this._scheduleTimeout();
    }
    return false;
  }
  // add a new item at the front
  this._history.unshift(0);
  this._rotated.unshift(this._getCurrent(this._humanUnit));
  // remove the last item while necessary
  while(this._history.length > this._buckets) {
    this._history.pop();
    this._rotated.pop();
  }

  if(this._automatic) {
    this._scheduleTimeout();
  }

  return true; // was rotated
};

Counter.prototype.history = function() {
  return { at: this._rotated, values: this._history };
};

Counter.prototype._scheduleTimeout = function() {
  var self = this;
  this.stop();
  this._timeout = setTimeout(function() {
    self.rotate();
  }, this._getCurrent(this._humanUnit).getTime() < this._rotated[0].getTime() + this._duration * this._unit);
};

// stop the current timeout
Counter.prototype.stop = function() {
  if(this._timeout) {
    clearTimeout(this._timeout);
  }
  this._timeout = null;
};

// Subclass the basic counter to create a hash-based counter.
// The only difference is that the `inc`/`set`/`get` functions require a key parameter
function CounterHash(options) {
  Counter.apply(this, options);
};

// inherit from Counter
CounterHash.prototype = Object.create(Counter.prototype, { constructor: { value: Counter, enumerable: false } });

// override the methods to work smoothly with a hash

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