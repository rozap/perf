import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import errorView from './widgets/error';
import menu from './widgets/menu';
import flash from './widgets/flash';

function model(store) {
  return {
    state: { items: [], count: 0 },
    namespace: 'suites',
    subscriptions: [
      // storeSubscription
    ],
    reducers: {
      list: (resp, state) => (_.extend({}, state, resp))
    },
    effects: {
      getSuites: (data, state, send, done) => {
        store.list('suite')
        .on('error', (error) => console.error("got an error!", error))
        .on('ok', (suites) => {
          console.log("suites are", suites);
          send('suites:list', suites, done)
        });
      }
    },
    subscriptions: [
      (send, done) => {
        console.log("SUITES SUBSCRIPTION FIRE");
      }
    ]
  };
}

function suiteView({id, name, description}) {
  return html`
    <div class="suite card">
      <h3>
        <a href="/app/suites/${id}">
          ${name}
        </a>
      </h3>
      <p>${description}</p>
    </div>
  `
}

function view(appState, prev, send) {
  const {suites: state} = appState;

  const getSuites = () => {
    send('suites:getSuites');
  }

  return html`
    <div class="app">
      ${menu(appState, send)}
      ${flash(appState, send)}

      <div class="content">
        <div class="suites-head" onload=${getSuites}>
          <div class="heading">
            <h1>Suites</h1>
          </div>
          <div class="create-new">
            <a class="pure-button pure-button-primary" href="suites/new">
              New Suite
            </a>
          </div>
        </div>

        <div class="suites">
          ${state.items.map((suite) => suiteView(suite))}
        </div>
      </div>
    </div>
  `
}

export default {
  model, view
}