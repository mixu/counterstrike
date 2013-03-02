var assert = require('assert'),
    Bucket = require('../index.js');

function getPeriod(unit) {
    var now = new Date();
    switch(unit) {
    case 'hour':
      return new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      break;
    case 'minute':
      return new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
      break;
    case 'second':
      return new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
      break;
    default:

  }
}

exports['given a counter'] = {

  'can increment counter': function() {
    this.c = new Bucket({
        duration: 1,
        unit: 'hour',
        buckets: 24 // retain one day's worth of data
      });
    assert.equal(this.c.inc(1), 1);
    assert.equal(this.c.inc(1), 2);
  },

  'the day is divided into clean increments based on the unit and duration': function() {
    var sizes = {
      hour: 60 * 60 * 1000,
      minute: 60 * 1000,
      second: 1000
    };

    ['hour', 'minute', 'second'].forEach(function(unit) {
//      console.log('unit', unit);
      var c = new Bucket({
          duration: 2,
          unit: unit,
          buckets: 24 // retain one day's worth of data
        });

      var currentPeriod = getPeriod(unit);

      var history = c.history();

      // assert that all history periods are hours, and are two hours apart
      Object.keys(history).forEach(function(time) {
        // console.log(new Date(parseInt(time, 10)), currentPeriod);
        assert.equal(new Date(parseInt(time, 10)).getTime(), currentPeriod.getTime());
        currentPeriod = new Date(currentPeriod.getTime() + 2 * sizes[unit]);
      });
    });
  },

  'rotating logs works correctly': function() {


  }


};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--bail', '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
