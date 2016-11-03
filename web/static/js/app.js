import {Socket} from "phoenix"
import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import store from './store'

import suites from './pages/suites';
import suite from './pages/suite';
import runs from './pages/runs';
import run from './pages/run';
import editSuite from './pages/edit-suite';
import newSuite from './pages/new-suite';
import register from './pages/register';
import login from './pages/login';
import home from './pages/home';

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

const channelFactory = store();
const api = channelFactory.create('api');


function rootModel() {
  return {
    state: {
      user: false,
      error: false
    },
    reducers: {
      setLocation: (loc, state) => {
        console.log(loc)
        return state;
      },
      login: (user, state) => _.extend({}, state, {user}),
      error: (error, state) => _.extend({}, state, {error})
    },
    effects: {
      invalidateSession: () => localStorage.clear(),
      logout: () => api.logout()
    },
    subscriptions: [
      (send, done) => {
        api.on('login:ok', (user) => {
          console.log(user, 'has logged in');
          send('login', user, done);
        })
      },
      (send, done) => {
        api.on('login:error', (error) => {
          send('invalidateSession', {}, done);
          send('error', error, done);
        })
      },
      (send, done) => {
        api.on('logout:ok', () => {
          send('invalidateSession', {}, done);
          send('login', false, done);
        });
      },
      (send, done) => {
        api.on('logout:error', (error) => {
          send('error', error, done);
        });
      }
    ]
  };
}


function startApp() {
  app.model(rootModel());
  app.model(suites.model(api));
  app.model(newSuite.model(api));
  app.model(editSuite.model(api));
  app.model(runs.model(api));
  app.model(run.model(api, channelFactory));

  app.model(register.model(api));
  app.model(login.model(api));


  app.router((route) => [
    route('/', home.view),
    route('/app/register', register.view),
    route('/app/login', login.view),

    route('/app/suites', suites.view, [
      route('new', newSuite.view),
      route(':id', editSuite.view),
    ]),
    route('/app/runs', runs.view, [
      route(':id', run.view)
    ])
  ])

  const tree = app.start();

  const el = document.querySelector('#app');
  el.innerHTML = '';
  el.appendChild(tree);
}

startApp();
