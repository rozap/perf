import {Socket} from "phoenix"
import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import createStore from './store'

import suites from './pages/suites';
import suite from './pages/suite';
import editSuite from './pages/edit-suite';
import newSuite from './pages/new-suite';
import register from './pages/register';
import login from './pages/login';

const app = choo({
  onError: function (err, state, createSend) {
    console.groupCollapsed(`Error: ${err.message}`)
    console.error(err)
    console.groupEnd()
  },
  onAction: function (data, state, name, caller, createSend) {
    console.groupCollapsed(`Action: ${caller} -> ${name}`)
    console.log(data)
    console.groupEnd()
  },
  onStateChange: function (data, state, prev, createSend) {
    console.groupCollapsed('State')
    console.log(prev)
    console.log(state)
    console.groupEnd()
  }
})

const fatalError = (e) => {
  console.error("i give up ;_;", e);
}


const store = createStore();


function rootModel() {
  return {
    state: {
      user: false,
      error: false
    },
    reducers: {
      login: (user, state) => _.extend({}, state, {user}),
      error: (error, state) => _.extend({}, state, {error})
    },
    effects: {
      invalidateSession: () => localStorage.clear(),
      logout: () => store.logout()
    },
    subscriptions: [
      (send, done) => {
        store.on('login:ok', (user) => {
          console.log(user, 'has logged in');
          send('login', user, done);
        })
      },
      (send, done) => {
        store.on('login:error', (error) => {
          send('invalidateSession', {}, done);
          send('error', error, done);
        })
      },
      (send, done) => {
        store.on('logout:ok', () => {
          send('invalidateSession', {}, done);
          send('login', false, done);
        });
      },
      (send, done) => {
        store.on('logout:error', (error) => {
          send('error', error, done);
        });
      }
    ]
  };
}


function startApp() {
  app.model(rootModel());
  app.model(suites.model(store));
  // app.model(suite.model(store));
  app.model(newSuite.model(store));
  app.model(editSuite.model(store));
  app.model(register.model(store));
  app.model(login.model(store));


  app.router((route) => [
    route('/app/register', register.view),
    route('/app/login', login.view),

    route('/app/suites', suites.view, [
      route('new', newSuite.view),
      route(':id', editSuite.view),
    ]),
  ])

  const tree = app.start();

  const el = document.querySelector('#app');
  el.innerHTML = '';
  el.appendChild(tree);
}

startApp();
