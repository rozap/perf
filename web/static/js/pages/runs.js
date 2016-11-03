import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import errorView from './widgets/error';
import menu from './widgets/menu';
import flash from './widgets/flash';
import pager from './widgets/pager';
import moment from 'moment';

function model(store) {
  return {
    state: { page: 0, collection: { items: [] }, hasLoaded: false },
    namespace: 'runs',
    reducers: {
      list,
      error,
      nextPage,
      prevPage
    },
    effects: {
      getRuns: _.partial(getRuns, store)
    }
  };
}

function getRuns(store, _, state, send, done) {
  const limit = 16;
  const offset = state.page * limit;
  store.list('run', {offset, limit})
  .on('error', (error) => send('runs:error'))
  .on('ok', (resp) => send('runs:list', resp, done));
}

function list(collection, state) {
  return {...state, collection, hasLoaded: true}
}

function error(error, state) {
  return {...state, error, hasLoaded: true}
}

function nextPage(_, state) {
  if(state.page >= state.collection.page_count) return state;
  return {...state, page: (state.page + 1)}
}

function prevPage(_, state) {
  if(state.page <= 0) return state;
  return {...state, page: (state.page - 1)}
}


function runView({id, suite, status, inserted_at, finished_at}) {
  var time = `started ${moment.utc(inserted_at).fromNow()}`;
  if(finished_at) {
    time = `finished ${moment.utc(finished_at).fromNow()}`;
  }

  const runStatus = () => {
    return html`
      <span class="status badge badge-${status.type.replace('_', '-')}">
        ${status.type}
      </span>
    `;
  }

  return html`
    <div class="run card">
      <h3>
        <a href="/app/runs/${id}">
          ${suite.name} ${time}
        </a>
      </h3>

      <div class="status">
        ${runStatus()}
      </div>
    </div>
  `
}

function view(appState, prev, send) {
  const {runs: state} = appState;

  const get = () => {
    send('runs:getRuns');
  }

  const onNextPage = () => {
    send('runs:nextPage');
    get();
  }
  const onPrevPage = () => {
    send('runs:prevPage');
    get();
  }

  const noRuns = () => {
    if(!state.hasLoaded) return;
    if(state.collection.items.length) return;
    return html`
      <div class="alert">You have not run any suites yet. To do so, click the "run" button on the suite page.</div>
    `;
  }

  return html`
    <div class="app" onload=${get}>
      ${menu(appState, send)}
      ${flash(appState, send)}

      <div class="content">
        <div class="suites-head">
          <div class="heading">
            <h4>Runs</h4>
          </div>
        </div>

        <div class="suites">
          ${noRuns()}
          ${state.collection.items.map((run) => runView(run))}
        </div>

        ${pager(state.collection, onNextPage, onPrevPage)}
      </div>
    </div>
  `
}

export default {
  model, view
}