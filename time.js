var sizes = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  },
  longNames = {
    millisecond: 'ms', milliseconds: 'ms',
    second: 's', seconds: 's',
    minute: 'm', minutes: 'm',
    hour: 'h', hours: 'h',
    day: 'd', days: 'd'
  };


exports.parse = function(value) {
  var parts = /^(\d+) ?(ms|milliseconds?|s|seconds?|m|minutes?|h|hours?|d|days?)$/.exec(value);
  if (!parts || !parts[1] || !parts[2]) return null;
  if(longNames[parts[2]]) {
    parts[2] = longNames[parts[2]];
  }
  return { value: parts[1], unit: parts[2] };
}

exports.convert = function(value, to) {
  if(value.unit == to) return value;
  // convert to milliseconds
  var base = value.value * sizes[value.unit];
  return { value: base / sizes[to], unit: to };
}
