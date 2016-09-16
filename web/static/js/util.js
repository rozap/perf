import _ from 'underscore';

function errorClass(name, state) {
  if(state.error && state.error[name]) {
    return 'error';
  }
  return '';
}

function getIn(obj, pathStr, def) {
  var path = pathStr.split('.');
  return path.reduce((acc, k) => {
    if(!acc) return;
    return acc[k];
  }, obj) || def;
}

function updateIn(obj, pathStr, theThing, value) {
  var path = pathStr.split('.');
  const key = path.pop();
  const things = getIn(obj, path.join('.'));
  const newThings = things.map((aThing) => {
    if(_.isEqual(aThing, theThing)) {
      aThing[key] = value;
    }
    return aThing;
  });
  return putIn(obj, pathStr, newThings);
}

function putIn(obj, pathStr, val) {
  var path = pathStr.split('.');
  const last = path.pop();
  const lastObj = path.reduce((acc, p) => {
    return _.extend({}, acc)[p];
  }, obj);
  lastObj[last] = val;
  return obj;
}


function formatTime(millis) {
  if(millis > 1000) {
    const seconds = millis / 1000;
    return seconds.toFixed(2) + 's';
  } else {
    return millis.toFixed(0) + 'ms';
  }
}

export {errorClass, putIn, updateIn, formatTime};

