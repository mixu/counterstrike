# bucket-count

Time-based counters and interval trackers.

Useful for collecting metrics, such as the number of requests per hour, or the response time of requests in the past hour.

- Creates well-defined intervals (e.g. if the duration is hourly, then the day is divided into 24 periods from 00:00 - 01:00 and so on)
- Values are aggregated over a specific duration (hourly, every 5 minutes etc.) and at the beginning of a new period the counters are stored into history and started from 0.
- Maximum number of values limits how much memory is used by old data
- No dependencies
- By default, the rotation manages it's own timeouts, but you can also manage the timeouts manually if you prefer.

## API

`new Bucket(options)`: creates a new bucket.

Options `{ duration: 12, unit: 'hour', buckets: 10 }`:

- buckets: the number of values to keep
- duration and unit: the interval at which the bucket is swiched (e.g. 1 day). It is a good idea to use units other than milliseconds, because if possible the intervals are made to correspond to a round number of (days/hours/minutes), e.g. if the unit is hour, then the hour starts at x:00 and rotates at (x+duration):00.

`.inc()`: increment the current counter, returns the current counter value.

`.get()`: returns the current value

`.set()`: sets the current value


## Examples

### Throttling / rate limiting

You'll probably actually want to track these by a more granular key, such as an IP address so the library should allow that.

Throttling a server:

    var Bucket = require('bucket-count');

    var counter = new Bucket({
        duration: 1,
        unit: 'hour',
        buckets: 1 // retain one hour of data
      });

    var maxRequests = 10;

    server.on('request', function(req, res) {
      if (counter.inc(1) > maxRequests) {
        res.end('Throttled');
      } else{
        console.log('Rate limit remaining:' + (maxRequests - counter.value()));
      }

    });

Throttling a task like a API request queue:

Throttling a stream to xx KB/sec:

### Keeping counts of requests, tracking load or memory over 1, 5, 15 minutes

    var Bucket = require('bucket-count');

    var counter = {
      requests: new Bucket({ duration: 100, unit: 'millisecond', buckets: 5 }),
      memory: new Bucket({ duration: 100, unit: 'millisecond', buckets: 5 }),
      loadavg: new Bucket({ duration: 100, unit: 'millisecond', buckets: 5 }),
    };

    server.on('request', function(req, res) {
      counter.inc(1);
    });

    setInterval(function() {
      counter.memory.set(os.freemem());
      counter.loadavg.set(os.loadavg());

      Object.keys(counter).forEach(function(name) {
        var history = counter[name].history();
        console.log(name);
        history.at.forEach(function(time, index) {
          console.log(
              time.getHours() + ':'+time.getMinutes()+':'+time.getSeconds()+'.'+time.getMilliseconds(),
              history.values[index]);
        })
      });
    }, 60 * 1000);

## Time intervals

    var Bucket = require('bucket-count');

    var counter = new Bucket({
        duration: 1,
        unit: 'hour',
        buckets: 24 * 7 // retain one week's worth of data
      });

    .on('request', function(req, res) {

      var start = new Date();

      setTimeout(function() {
        res.end();
        counter.interval(new Date() - start);
      });

      Response times
      minimum: 1408
      maximum: 5725
      mean: 2540.66
      std_dev: 1798.58
      median: 1499
      count: 6
      75%: 4198.75
      95%: 5725
      99%: 5725
      99.9%: 5725


    });
