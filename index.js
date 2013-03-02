var sizes = {
  hour: 60 * 60 * 1000,
  minute: 60 * 1000,
  second: 1000
};

function Bucket(options) {
  // settings
  this._humanUnit = options.unit;
  this._unit = sizes[options.unit];
  this._duration = options.duration;
  this._buckets = options.buckets;
  this._unsafe = options.unsafe || false;

  // track history as an array
  this._history = [];
  // track the rotation times to know when the values in history were recorded
  this._rotated = [];

  this.rotate();
}

Bucket.prototype._getCurrent = function(unit) {
  var now = new Date();
  switch(unit) {
    case 'hour':
      return new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    case 'minute':
      return new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
      break;
    case 'second':
      return new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
    default:
  }
  return new Date();
}

Bucket.prototype.inc = function(n) {
  this._history[0] += (arguments.length > 0 ? n : 1);
  return this._history[0];
};

Bucket.prototype.value = function() {
  return this._history[0];
};

// rotate the history
Bucket.prototype.rotate = function() {
  if(!this._unsafe &&
      this._rotated[0] &&
      this._getCurrent(this._humanUnit).getTime() < this._rotated[0].getTime() + this._duration * this._unit) {
    return false; // still in the same time interval, so we should not rotate
  }
  // add a new item at the front
  this._history.unshift(0);
  this._rotated.unshift(this._getCurrent(this._humanUnit));
  // remove the last item while necessary
  while(this._history.length > this._buckets) {
    this._history.pop();
    this._rotated.pop();
  }

  return true; // was rotated
};

Bucket.prototype.history = function() {
  return this._history;
};


// schedule a timeout
Bucket.prototype.refresh = function() {

};

module.exports = Bucket;