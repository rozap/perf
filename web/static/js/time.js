import moment from 'moment';

const defaultFormat = 'MM/DD/YYYY h:mm a'

function dateToSeconds(date) {
  return moment.utc(date).unix();
}
function secondsToDate(seconds) {
  return moment(seconds * 1000);
}
function nanoToSeconds(nanos) {
  return nanos / (1000 * 1000);
}

function domainOf(run) {
  const startSeconds = dateToSeconds(run.started_at);
  const endSeconds = startSeconds + (run.duration / 1000);

  return {
    startSeconds,
    endSeconds,
    duration: run.duration
  }
}

function utcFormat(t) {
  return moment.utc(t).format(defaultFormat);
}

function timeFormat(epoch) {
  var d = moment.utc(epoch);
  return d.format('HH:mm:ss');
}

function millisFormat(millis) {
  if(millis > 1000) {
    const seconds = millis / 1000;
    return seconds.toFixed(2) + 's';
  } else {
    return millis.toFixed(0) + 'ms';
  }
}


export {
  dateToSeconds, secondsToDate, nanoToSeconds, domainOf, utcFormat, timeFormat, millisFormat
}