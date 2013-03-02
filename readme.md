# bucket-count

Time-based counters and interval trackers.

Useful for collecting metrics, such as the number of requests per hour, or the response time of requests in the past hour.

- Creates well-defined intervals (e.g. if the duration is hourly, then the day is divided into 24 periods from 00:00 - 01:00 and so on)
- Values are aggregated over a specific duration (hourly, every 5 minutes etc.) and at the beginning of a new period the counters are stored into history and started from 0.
- Maximum number of values limits how much memory is used by old data
- No dependencies
- By default, the rotation manages it's own timeouts, but you can also manage the timeouts manually if you prefer.

## Counting

### Throttling / rate limiting

You'll probably actually want to track these by a more granular key, such as an IP address so the library should allow that.

Throttling a server:

    var Bucket = require('bucket-count');

    var counter = new Bucket({
        duration: 1,
        unit: 'hour',
        buckets: 1 // retain one hour of data
      });

    .on('request', function(req, res) {

      if (counter.inc('requests', 1) > 1000) {
        res.end('Throttled');
      } else{

        console.log('Rate limit remaining:' + counter.value());

      }

    });

Throttling a task like a API request queue:

Throttling a stream to xx KB/sec:


### Keeping hourly counts of requests

    var Bucket = require('bucket-count');

    var counter = new Bucket(
        duration: 1,
        unit: 'hour',
        buckets: 24 * 7 // retain one week's worth of data
      );

    .each(function(timestamp, bucket) {

    });

### Tracking load or memory over 1, 5, 15 minutes

    setInterval(function() {

      counter.set( os.getCpu() );

    }, 60 * 1000);

    // Average 0..4, 0..9, 0..14

    console.log('Load 1 min: '+);
    console.log('Load 5 min: '+);
    console.log('Load 15 min: '+);


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
