var assert = require('assert'),
    Counter = require('../index.js');

function getPeriod(unit) {
    var now = new Date();
    switch(unit) {
    case 'hour':
      return new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    case 'minute':
      return new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
    case 'second':
      return new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
    case 'millisecond':
      return new Date();
    default:

  }
}

exports['given a counter'] = {

  'can increment counter': function() {
    this.c = new Counter({
        interval: '1h',
        store: '1d' // retain one day's worth of data
      });

    assert.equal(this.c.inc(1), 1);
    assert.equal(this.c.inc(1), 2);
    // check the calculations
    assert.deepEqual(this.c._interval, { value: 1, unit: 'h'});
    assert.deepEqual(this.c._store, { value: 1, unit: 'd' });
    assert.equal(this.c._buckets, 24);

  },

  'the day is divided into clean increments based on the unit and duration': function() {
    var sizes = {
      hour: 60 * 60 * 1000,
      minute: 60 * 1000,
      second: 1000
    };

    ['hour', 'minute', 'second'].forEach(function(unit) {
      console.log('unit', unit);
      var c = new Counter({
          interval: '2 '+ unit,
          store: 24 // retain 24 items
        });

      var currentPeriod = getPeriod(unit).getTime();

      // assert that the current rotation times are correct (e.g. on the hour, on the minute, on the second)
      c.history().at.sort(function(a, b) { return parseInt(b, 10) - parseInt(a, 10);}).forEach(function(time) {
        console.log(time);
        console.log(time, new Date(currentPeriod));
        assert.equal(time.getTime(), currentPeriod);
        currentPeriod = currentPeriod - 2 * sizes[unit];
      });
    });
  },

  'rotating logs works correctly when rotation does not check for time elapsed': function() {
    var c = new Counter({
        unsafe: true,
        interval: '1 millisecond',
        store: 3 // three items of history
      });

    c.inc();
    assert.equal(1, c.get());
    console.log(c);
    c.rotate();
    c.inc(10);
    assert.equal(10, c.get());
    console.log(c);
    c.rotate();
    c.inc(100);
    assert.equal(100, c.get());
    console.log(c);
    c.rotate();
    c.inc(1000);
    assert.equal(1000, c.get());
    console.log(c);
  },

  'rotating logs works correctly when rotation checks for time elapsed': function() {
    var c = new Counter({
        interval: '2 milliseconds',
        store: 3// three items of history
      });

    var exit = false;
    var checks = [
      function() {
        c.inc();
        assert.equal(1, c.get());
        console.log(c);
      },
      function() {
        c.inc(10);
        assert.equal(10, c.get());
        console.log(c);

      },
      function() {
        c.inc(100);
        assert.equal(100, c.get());
        console.log(c);
      },
      function() {
        c.inc(1000);
        assert.equal(1000, c.get());
        console.log(c);
        exit = true;
      }
    ];

    while(!exit) {
      if(c.rotate()) {
        checks[0]();
        checks.shift();
      }
    }
  }

};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--bail', '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
