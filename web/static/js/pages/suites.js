import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import errorView from './widgets/error';
import menu from './widgets/menu';
import flash from './widgets/flash';

function model(store) {
  return {
    state: { items: [], count: 0, hasLoaded: false },
    namespace: 'suites',
    reducers: {
      list,
      error
    },
    effects: {
      getSuites: _.partial(getSuites, store)
    }
  };
}

function getSuites(store, data, state, send, done) {
  store.list('suite')
  .on('error', (error) => send('suites:error', error, done))
  .on('ok', (suites) => send('suites:list', suites, done));
}

function list({items, count}, state) {
  return {
    ...state,
    hasLoaded: true,
    items,
    count
  }
}

function error(error, state) {
  return {
    ...state,
    hasLoaded: true,
    error
  }
}

function requestView(request) {
  return html`
    <li>
      <span class="badge badge-${request.method.toLowerCase()}">${request.method}</span>
      <span>${request.path}</span>
    </li>
  `
}

function suiteView({id, name, requests}) {
  return html`
    <div class="suite card">
      <h3>
        <a href="/app/suites/${id}">
          ${name}
        </a>
      </h3>
      <ul class="requests">
        ${requests.map((r) => requestView(r))}
      </ul>
    </div>
  `
}

function view(appState, prev, send) {
  const {suites: state} = appState;

  if(!state.hasLoaded) {
    send('suites:getSuites');
  }

  const noSuites = () => {
    if(!state.hasLoaded) return;
    if(state.items.length) return;
    return html`
      <div class="alert">You have not created any suites yet. To do so, click the "New Suite" button.</div>
    `;
  }


  return html`
    <div class="app">
      ${menu(appState, send)}
      ${flash(appState, send)}

      <div class="content">
        <div class="suites-head">
          <div class="heading">
            <h4>Suites</h4>
            <a class="pure-button pure-button-primary" href="suites/new">
              New Suite
            </a>
          </div>
        </div>

        <div class="suites">
          ${noSuites()}
          ${state.items.map((suite) => suiteView(suite))}
        </div>
      </div>
    </div>
  `
}

export default {
  model, view
}