import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import errorView from './widgets/error';
import menu from './widgets/menu';
import flash from './widgets/flash';
import moment from 'moment';

function model(store) {
  return {
    state: { items: [], count: 0, hasLoaded: false },
    namespace: 'runs',
    reducers: {
      list
    },
    effects: {
      getRuns: _.partial(getRuns, store)
    }
  };
}

function getRuns(store, _, state, send, done) {
  console.log(store);
  store.list('run')
  .on('error', (error) => send('runs:error'))
  .on('ok', (resp) => send('runs:list', resp, done));
}

function list({count, items}, state) {
  return {
    ...state,
    hasLoaded: true,
    items,
    count
  }
}

function error(resp, state) {
  return {
    ...state,
    hasLoaded: true
  }
}

function runView({id, suite, inserted_at, finished_at}) {
  var time = `ran ${moment.utc(inserted_at).fromNow()}`;
  if(finished_at) {
    time = `finished ${moment.utc(finished_at).fromNow()}`;
  }

  return html`
    <div class="run card">
      <h3>
        <a href="/app/runs/${id}">
          ${suite.name} ${time}
        </a>
      </h3>
    </div>
  `
}

function view(appState, prev, send) {
  const {runs: state} = appState;

  if(!state.hasLoaded) {
    send('runs:getRuns');
  }

  return html`
    <div class="app">
      ${menu(appState, send)}
      ${flash(appState, send)}

      <div class="content">
        <div class="suites-head">
          <div class="heading">
            <h4>Runs</h4>
          </div>
        </div>

        <div class="suites">
          ${state.items.map((run) => runView(run))}
        </div>
      </div>
    </div>
  `
}

export default {
  model, view
}