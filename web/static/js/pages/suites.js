import choo from "choo"
import html from "choo/html"
import _ from "underscore";

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
    <div class="suite">
      <h2>
        <a href="/app/suites/${id}">
          ${name}
        </a>
      </h2>
      <p>${description}</p>
    </div>
  `
}

function view({suites: state}, prev, send) {
  return html`
    <main>
      <div>
        <div class="pure-g">
          <div class="pure-u-2-3">
            <h1>Suites</h1>
          </div>
          <div class="pure-u-1-3">
            <a class="pure-button pure-button-primary" href="suites/new">
              New Suite
            </a>
          </div>
        </div>

        <div class="suites">
          ${state.items.map((suite) => suiteView(suite))}
        </div>
      </div>
    </main>
  `
}

export default {
  model, view
}