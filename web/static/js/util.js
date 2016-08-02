import _ from 'underscore';

function errorClass(name, state) {
  if(state.error && state.error[name]) {
    return 'error';
  }
  return '';
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

function updateIn(arr, toUpdate, toReplace) {
  return arr.map((item) => {
    return _.isEqual(item, toUpdate)? toReplace: toUpdate;
  });
}


export {errorClass, putIn, updateIn};

