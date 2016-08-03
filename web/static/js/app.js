import {Socket} from "phoenix"
import choo from "choo"
import html from "choo/html"

import createStore from './store'

import suites from './pages/suites';
import suite from './pages/suite';
import editSuite from './pages/edit-suite';
import newSuite from './pages/new-suite';

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

const socket = new Socket("/socket", {params: {token: window.userToken}})

socket.connect()

socket.onOpen(() => {
  createStore(socket, (error, store) => {
    if(!error) {
      startApp(store);
    } else {
      //show some sort of error
    }
  });
});
socket.onError((e) => {
  console.error("socket error", e)
  //show some sort of error
});



function startApp(store) {
  app.model(suites.model(store));
  app.model(suite.model(store));
  app.model(newSuite.model(store));

  app.router((route) => [
    route('/app/suites', suites.view, [
      route('new', newSuite.view),
      route(':id', suite.view),
    ]),
  ])

  const tree = app.start();

  const el = document.querySelector('#app');
  el.innerHTML = '';
  el.appendChild(tree);
}
