# bucket-count

Time-based counters and interval trackers.

Useful for collecting metrics, such as the number of requests per hour, or the response time of requests in the past hour.

- Creates well-defined intervals (e.g. if the duration is hourly, then the day is divided into 24 periods from 00:00 - 01:00 and so on)
- Values are aggregated over a specific duration (hourly, every 5 minutes etc.) and at the beginning of a new period the counters are stored into history and started from 0.
- Maximum number of values limits how much memory is used by old data
- No dependencies
- By default, the rotation manages it's own timeouts, but you can also manage the timeouts manually if you prefer.


### Throttling

    var Bucket = require('bucket-count');

    var counter = new Bucket({
        duration: 60 * 60 * 1000, // switch buckets hourly
        values: 24 * 7 // retain one week's worth of data
      });

    .on('request', function(req, res) {

      if (counter.inc('requests', 1) > 1000) {
        res.end('Throttled');
      }

    });

### Keeping hourly counts of requests

    var Bucket = require('bucket-count');

    var counter = new Bucket();


    .each(function(timestamp, bucket) {

    });

