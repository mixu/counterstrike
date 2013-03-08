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
            duration: 10, unit: 'millisecond',
            buckets: 10 // retain 200 milliseconds
          }),
        hourly = new Counter({
            automatic: false,
            unsafe: true,
            duration: 20, unit: 'millisecond',
            buckets: 10 // retain 1 second of data
          });

    // increment the hourly counter when the realtime counter is updated
    var counter = 1,
        stopped = false;
    realtime.on('rotate', function() {
      if(counter > 10) {
        // end
        realtime.stop();
        stopped = true;

        if(stopped) {
          var total = hourly.history().values.reduce(function(prev, current) {
              return prev + current;
            }, 0);
          console.log(total);
          console.log(hourly.history().values);

          assert.equal(55, total);
          assert.deepEqual([ 0,10,9,8,7,6,5,4,3,2 ], realtime.history().values);
          assert.deepEqual([ 0,19,15,11,7,3], hourly.history().values);
          done();
        }


      } else {
        realtime.inc(counter);
        counter++;
      }
    });

    // It's better to use the absolute number of items seen to perform aggregations, because
    // timeouts will always run either after or before the interval (never concurrently) so items can be grouped oddly and counted multiple times.
    var i = 0;
    realtime.on('rotate', function() {
      console.log('value', realtime.get());
      i++;
      if(i % (hourly._duration / realtime._duration) == 0) {
        var values = realtime.history().values;
        console.log(values);
        var sum = values.slice(0, (hourly._duration / realtime._duration)).reduce(function(prev, current) {
          return prev + current;
        }, 0);
        hourly.set(sum);
        hourly.rotate();
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
