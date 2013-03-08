# counterstrike

Counters that rotate periodically for collecting metrics in memory - optionally with Graphite-style lossy data aggregation.

Useful for collecting metrics, such as the number of requests per hour and aggregating them into daily stats in memory.

Supports both simple counters and sets of counters/values in a hash.

Key features:

- No external dependencies
- Fixed memory usage based on limited retention (optionally, with Graphite-style aggregations - see last example)
- Values are rotated every X seconds/minutes/hours/days, with logic that prefers rotating at the beginning of the hour/day/month to make it easy to track hourly/daily etc. metric values
- Friendly units (e.g. store '2 days' of '10 minute' data)
- By default, the counter manages it's own timeouts, but you can also manage the timeouts manually if you prefer to do that (e.g. if you have a bunch of other tasks that also run periodically)

## API

There are two classes, which mostly share the same internals:

- Counter: A simple rotating counter (e.g. for tracking a single metric)
- Counter.Hash: A rotating set of counters (e.g. for tracking multiple metrics over the same interval)

### Counter API

`new Counter(options)`: creates a new counter.

Options `{ interval: '1h', store: '2 days' }`:

- interval: the interval at which the current value is rotated (e.g. 1 hour).
- store: the amount of data to store. This can be either be the number values to store (plain integer), or an amount of time (e.g. 2 days). If an amount of time is specified, then the number of values needed will be calculated based on the rotation interval.

Note: You should specify the interval using the appropriate units (e.g. days rather than milliseconds) because the library will then rotate the value at the beginning of the hour/day/month (e.g. at 01:00, then 02:00).

- source:

Advanced options:

- automatic (optional): If false, then timeouts are not scheduled automatically, you need to call rotate() manually at least once every aggregation interval. Defaults to true, which means that a timeout is scheduled automatically after every interval and you don't need to worry about calling rotate().
- unsafe (optional): If true, then calls to rotate() always rotate; defaults to false, which means that calls to rotate() check that the current time falls onto a new interval before rotating. This makes it easier to call rotate since you can make redundant calls without worrying about it.

`.inc([n])`: increment the current counter, returns the current counter value. `n` is optional, defaults to 1.

`.get()`: returns the current value

`.set()`: sets the current value

`.rotate()`: moves the current value to history, and starts counting from zero. If you want to manage the rotation explicitly, then call this function at least once every aggregation interval.

`.stop()`: clears the interval

`.on(event, callback)`/`.once(event, callback)`: The counter is an event emitter, which has the following events:

- `.on("rotate", function() {})`: triggered just before the log rotation happens. This is a good point to read or alter the value that is about to be rotated into history.

- `.on("aggregate", function() {})`: triggered if the counter is initialized with the `source` parameter. Occurs when enough data has been collected at the source to write a value into the current counter. See the last example for how to use this.

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
        store: '24h',
        interval: '1h'
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

This requires reducing the total amount when you complete a task.


### Keeping counts of requests, tracking load or memory over 1, 5, 15 minutes

When you're tracking multiple values at the same update interval, it's best to use a CounterHash:

    var Counter = require('counterstrike');

    var counter = {
      requests: new Counter({ interval: '100ms', store: '10m' }),
      memory: new Counter({ interval: '100ms', store: '10m' }),
      loadavg: new Counter({ interval: '100ms', store: '10m' }),
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

Instead, you should use just one timeout - the lowest level one - to drive the upper level aggregation. This guarantees that each item is only processed once, and that each aggregation is consistent with each other.


    var Counter = require('counterstrike');

    var realtime = new Counter({
            store: '1h',
            interval: '10s'
          }),
        hourly = new Counter({
            store: '24h',
            interval: '1m',
            source: realtime
          }),
        daily = new Counter({
            store: '1w',
            interval: '1d',
            source: hourly
          });

    var i = 0;

    // when the realtime values rotate, check whether you should aggregate into and rotate the hourly counter

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

    // when the hourly values rotate, check whether you should aggregate into the daily counter
    hourly.on('rotate', function() {
      daily.set(sum);
      daily.rotate();
    });

You could run these as different counters, each on their own time interval. The only problem with that approach is that since timeouts are not guaranteed to run at a particular time, you can get odd groupings and/or duplicate counts of items.

An example of this issue might be when the lowest level emits 1, 2, 3, 4 (at slightly irregular intervals) and the upper level aggregates this at two points in time as the histories: [1, 2], [2, 3] and [4]. Here, 2 has been selected twice because the upper level timer inevitably runs either slightly before, or slightly after the scheduled time.
