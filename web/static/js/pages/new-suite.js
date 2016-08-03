import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import loader from './widgets/loader';
import error from './widgets/error';

function model(store) {
  window.store = store;
  return {
    state: {
      error: false
    },
    reducers: {
      createdSuite,
      genericError
    },
    effects: {
      createNewSuite: _.partial(createNewSuite, store)
    }
  }
}

function createNewSuite(store, data, state, send, done) {
  console.log('Create new!')
  store.create('suite', {})
  .on('error', (e) => send('genericError', e, done))
  .on('ok', (suite) => {
    send('createdSuite', suite, done);
  });
}

function genericError(reason, state) {
  return {...state, error: reason};
}

function createdSuite(data, state) {
  console.log(data, state);
  return state;
}

function view(state, prev, send) {
  const fire = () => {
    send('createNewSuite')
  }
  return html`
    <div class="pure-g" onload=${fire}>
      ${loader()}
      ${error(state)}
    </div>
  `;
}

export default {model, view};