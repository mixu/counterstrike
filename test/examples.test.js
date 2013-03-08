var assert = require('assert'),
    Counter = require('../index.js');

exports['examples'] = {

/*

  'throttling server requests': {

    before: function() {
      var counter = this.c = new Counter({
        duration: 2,
        unit: 'millisecond',
        buckets: 1
      });

      var maxRequests = 3;

      this.request = function() {
        if (counter.inc(1) > maxRequests) {
          return 'throttle';
        } else{
          return maxRequests - counter.get();
        }
      }
    },

    'when the maximum number of requests is filled, no more requests are accepted': function() {
      var expected = [2, 1, 0, 'throttle'],
          request = this.request;
      expected.forEach(function(expect) {
        var actual = request();
        console.log(actual);
        assert.equal(expect, actual);
      });
    },

    'after the duration has passed, more requests go through': function(done) {
      var self = this;
      setTimeout(function() {
        self.c.rotate(); // works because unsafe counter
        assert.equal(2, self.request());
        done();
      }, 3);
    }
  },

  'request counters': function(done) {
    this.timeout(10000);
    // note: smaller durations have issues since setTimeout is not millisecond-accurate (it can be ~several milliseconds late or early)
    var counter = {
      requests: new Counter({ duration: 1, unit: 'second', buckets: 5 }),
      memory: new Counter({ duration: 1, unit: 'second', buckets: 5 }),
      loadavg: new Counter({ duration: 1, unit: 'second', buckets: 5 }),
    };

    var os = require('os');

    var rates = [ 100, 200, 300, 400, 500 ];
    function queue() {
      var rate = rates.pop();

      Object.keys(counter).forEach(function(c) {
        counter[c].rotate();
      });

      counter.requests.inc(rate);
      counter.memory.set(os.freemem());
      counter.loadavg.set(os.loadavg());

      if(rates.length != 0) {
        setTimeout(queue, counter.requests._duration * 1000 + 10);
      } else {
        // var spark = require('textspark');

        Object.keys(counter).forEach(function(name) {
          var history = counter[name].history();
          console.log(name);
          history.at.forEach(function(time, index) {
            console.log(time.getHours() + ':'+time.getMinutes()+':'+time.getSeconds()+'.'+time.getMilliseconds(),  history.values[index]);
          })
        });

        // console.log(spark(counter.requests.history().values));
        done();
      }
    }
    setTimeout(queue, counter.requests._duration * 1000 + 10);
  },
*/
  'limited data retention': function(done) {
    this.timeout(200000);
    var realtime = new Counter({
            duration: 500, unit: 'millisecond',
            buckets: 10 // retain 200 milliseconds
          }),
        hourly = new Counter({
            duration: 1, unit: 'second',
            buckets: 10 // retain 1 second of data
          });

    // increment the hourly counter when the realtime counter is updated


    // when the hourly values rotate, pull in the real time data from the last 1 minute and sum it
    hourly.on('rotate', function() {
      var items = realtime.history(hourly._rotated[0].getTime()).values;
      console.log(hourly._rotated[0].getTime(), items);
      var sum = items.reduce(function(prev, current) {
        return prev + current;
      }, 0);
      hourly.set(sum);

      if(stopped) {
        hourly.stop();

        var total = hourly.history().values.reduce(function(prev, current) {
            return prev + current;
          }, 0);
        console.log(total);

        assert.deepEqual([ 0,9,8,7,6,5,4,3,2,1 ], realtime.history().values);
        assert.equal(45, total);
//        assert.deepEqual([ 0, 17,13,9,5,1], hourly.history().values);
        done();
      }
    });

    // use the realtime rotate timeout to enter in data
    var counter = 1, stopped = false;
    realtime.on('rotate', function() {
      var rate = counter++;
      if(counter > 10) {
        // end
        realtime.stop();
        stopped = true;
      } else {
        process.nextTick(function() {
          realtime.inc(rate);
        });
      }
    });
  }

};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--bail', '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
