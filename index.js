function Bucket(options) {
  var now = new Date(),
      currentPeriod;

  // settings
  this._unit = options.unit;
  this._duration = options.duration;
  this._buckets = options.buckets;

  switch(options.unit) {
    case 'hour':
      currentPeriod = new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      this._unit = 60 * 60 * 1000;
      break;
    case 'minute':
      currentPeriod = new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
      this._unit = 60 * 1000;
      break;
    case 'second':
      currentPeriod = new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
      this._unit = 1000;
      break;
    default:

  }
  this._currentKey = currentPeriod.getTime();
  this._history = {};
  this._history[this._currentKey] = 0;
  this.rotate();
}

Bucket.prototype.inc = function(n) {
  this._history[this._currentKey] += (arguments.length > 0 ? n : 1);
  return this._history[this._currentKey];
};

// rotate the history
Bucket.prototype.rotate = function() {
  // clear out any items that are too old, also, figure out what the oldest period is in history

  // remove any history that is older than the duration times `options.buckets`



  // if there are fewer history items than `options.buckets`, then fill them in
  for(var i = 0; i < this._buckets; i++) {
    this._history[ this._currentKey + this._duration * this._unit * i ] = 0;
  }

};

Bucket.prototype.history = function() {
  return this._history;
};


// schedule a timeout
Bucket.prototype.refresh = function() {

};

module.exports = Bucket;