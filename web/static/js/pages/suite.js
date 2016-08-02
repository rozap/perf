import choo from "choo"
import html from "choo/html"

function model(store) {
  return {
    state: { suite: {} },
    namespace: 'suite',
    subscriptions: [
      // storeSubscription
    ],
    reducers: {
      get: (suite, state) => ({ ...state, suite })
    },
    effects: {
      getSuite: (id, state, send, done) => {
        store.get('suite', {id})
        .on('error', (e) => console.log(e))
        .on('ok', (suite) => send('suite:get', suite, done))
      }
    }
  }
}


function view({suite: state, params}, prev, send) {
  console.log(state.suite)
  return html`
    <main>
      <div onload=${() => send('suite:getSuite', params.id)}>
        <h1>Suite ${state.suite.name}</h1>
        <p>${state.suite.description}</p>
      </div>
    </main>
  `
}

export default {
  model, view
}