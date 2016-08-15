import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import loader from './widgets/loader';
import errorView from './widgets/error';
import menu from './widgets/menu';
import flash from './widgets/flash';
import {emptySuite} from './edit-suite';

function model(store) {
  return {
    namespace: 'newSuite',
    state: {
      error: false
    },
    reducers: {
      error
    },
    effects: {
      create: _.partial(create, store)
    }
  }
}

function create(store, data, state, send, done) {
  console.log('Create new!')
  store.create('suite', emptySuite())
  .on('error', (e) => send('newSuite:error', e, done))
  .on('ok', (suite) => {
    window.location.replace(`/app/suites/${suite.id}`);
  });
}

function error(error, state) {
  return {...state, error: error};
}


function view(appState, prev, send) {
  const {newSuite: state} = appState;
  const fire = () => send('newSuite:create');
  return html`
    <div class="app">
      ${menu(appState, send)}
      ${flash(appState, send)}

      <div class="pure-g constrained" onload=${fire}>
        ${errorView(state, send)}
        ${loader('Creating a new suite just for you')}
      </div>
    </div>
  `;
}

export default {model, view};