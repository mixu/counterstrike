# counterstrike

Counters that rotate periodically for collecting metrics in memory, inspired by statsd.

Useful for collecting metrics, such as the number of requests per hour, or the response time of requests in the past hour.

Supports both simple counters and sets of counters/values in a hash.

Key features:

- Values are rotated every X seconds/minutes/hours/days, with logic that prefers rotating on well-defined intervals (e.g. at :00) to make it easy to track hourly/daily etc. metric values
- Fixed memory usage: Maximum number of values limits how much memory is used by old data.
- Well-defined intervals when possible: e.g. if the duration is hourly, then the day is divided into 24 periods from 00:00 - 01:00 and so on
- No external dependencies
- By default, the counter manages it's own timeouts, but you can also manage the timeouts manually if you prefer to do that (e.g. if you have a bunch of other tasks that also run periodically)

## API

There are two classes, which mostly share the same internals:

- Counter: A simple rotating counter (e.g. for tracking a single metric)
- Counter.Hash: A rotating set of counters (e.g. for tracking multiple metrics over the same interval)

### Counter API

`new Counter(options)`: creates a new counter.

Options `{ duration: 12, unit: 'hour', buckets: 10 }`:

- buckets: the number of values to keep
- duration and unit: the interval at which the bucket is swiched (e.g. 1 day). It is a good idea to use units other than milliseconds, because if possible the intervals are made to correspond to a round number of (days/hours/minutes), e.g. if the unit is hour, then the hour starts at x:00 and rotates at (x+duration):00.
- default: the default value, set when the bucket is rotated. Default is 0.
- automatic (optional): If false, then timeouts are not scheduled automatically, you need to call rotate() manually at least once every aggregation interval. Defaults to true, which means that a timeout is scheduled automatically after every interval and you don't need to worry about calling rotate().
- unsafe (optional): If true, then calls to rotate() always rotate; defaults to false, which means that calls to rotate() check that the current time falls onto a new interval before rotating. This makes it easier to call rotate since you can make redundant calls without worrying about it.

`.inc([n])`: increment the current counter, returns the current counter value. `n` is optional, defaults to 1.

`.get()`: returns the current value

`.set()`: sets the current value

`.rotate()`: moves the current value to history, and starts counting from zero. If you want to manage the rotation explicitly, then call this function at least once every aggregation interval.

`.stop()`: clears the interval

`.on(event, callback)`/`.once(event, callback)`: The counter is an event emitter, which has the following events:

- `.on("rotate", function() {})`: triggered just before the log rotation happens. This is a good point to read or alter the value that is about to be rotated into history.

### Counter.Hash API

The other functions are the same as in Counter, but the value manipulation functions take a `key` argument, e.g.:

`.inc(key, [n])`: increment the value in `key`, returns the value. `n` is optional, defaults to 1.

`.get(key)`: returns the value in `key`

`.set(key)`: sets the value in `key`

## Examples

### Throttling / rate limiting

You'll probably actually want to track these by a more granular key, such as an IP address so the library should allow that.

Throttling a server:

    var Counter = require('counterstrike');

    var counter = new Counter({
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

    var Counter = require('counterstrike');

    var counter = {
      requests: new Counter({ duration: 100, unit: 'millisecond', buckets: 5 }),
      memory: new Counter({ duration: 100, unit: 'millisecond', buckets: 5 }),
      loadavg: new Counter({ duration: 100, unit: 'millisecond', buckets: 5 }),
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

### statsd/graphite -style limited data retention

Let's say you want to track:

- 1 hour of 10 second data
- 24 hours of 1 minute data
- 1 week of hourly data

And you want to aggregate the values by adding the values - this is useful for something like a request counter, but for other types of countable things you might use an average, sum, min, max, or the latest value depending on what you're tracking.

    var Counter = require('counterstrike');

    var realtime = new Counter({
            duration: 10, unit: 'second',
            buckets: (60 * 60) / 10 // retain an hour, e.g. 60 minutes in seconds / 10 seconds
          }),
        hourly = new Counter({
            duration: 1, unit: 'minute',
            buckets: (24 * 60) // e.g. 24 hours in minutes / 1 minute
          }),
        daily = new Counter({
            duration: 1, unit: 'day',
            buckets: 7 // e.g. 1 week in days / 1 day
          });

    // when the hourly values rotate, pull in the real time data from the last 1 minute and sum it
    hourly.on('rotate', function() {
      var sum = realtime.history('1 minute').values.reduce(function(prev, current) {
        return prev + current;
      }, 0);
      hourly.set(sum);
    });

    // when the daily values rotate, pull in hourly data from the last day and sum it
    daily.on('rotate', function() {
      var sum = realtime.history('1 minute').values.reduce(function(prev, current) {
        return prev + current;
      }, 0);
      daily.set(sum);
    });


