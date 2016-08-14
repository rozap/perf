import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import loader from './widgets/loader';
import errorView from './widgets/error';
import successView from './widgets/success';
import fieldError from './widgets/field-error';
import menu from './widgets/menu';
import flash from './widgets/flash';

function model(store) {
  return {
    namespace: 'login',
    state: {
      error: false,
      success: false,
      email: '',
      password: ''
    },
    reducers: {
      updateEmail,
      updatePassword,
      failure,
      success
    },
    effects: {
      login: _.partial(login, store),
    }
  }
}

function updatePassword(password, state) {
  return {...state, password: password};
}
function updateEmail(email, state) {
  return {...state, email: email};
}

function login(store, _data, {email, password}, send, done) {
  store.create('session', {email, password})
  .on('error', (e) => send('login:failure', e, done))
  .on('ok', (resp) => {
    localStorage['session'] = JSON.stringify(resp);
    send('login:success', resp, done);
    send('login', resp.user, done);
  });
}

function failure(reason, state) {
  return {...state, error: reason, success: false};
}

function success(_data, state) {
  return {...state, error: false, success: true};
}


function view(appState, prev, send) {
  const {login: state} = appState;

  const onUpdateEmail = (e) => {
    send('login:updateEmail', e.target.value);
  }
  const onUpdatePassword = (e) => {
    send('login:updatePassword', e.target.value);
  }
  const login = () => {
    send('login:login');
  }
  return html`
  <div class="app">
    ${menu(appState, send)}
    ${flash(appState, send)}

    <div class="constrained">
      <div class="pure-g">
        <div class="pure-u-1-1">
          <h2>Login</h2>
        </div>
        ${errorView(state)}
        ${successView(state, 'You have logged in')}
        <div class="pure-u-1-1">
          <form class="pure-form pure-form-aligned">
            <fieldset>
                <div class="pure-control-group">
                    ${fieldError(state, 'email')}
                    <label for="email">Email Address</label>
                    <input
                      name="email"
                      type="email"
                      onkeyup=${onUpdateEmail}
                      placeholder="Email Address">
                </div>
                <div class="pure-control-group">
                    ${fieldError(state, 'password')}
                    <label for="password">Password</label>
                    <input
                      name="password"
                      type="password"
                      onkeyup=${onUpdatePassword}
                      placeholder="Password">
                </div>
            </fieldset>
          </form>
          <a
            class="pure-button"
            href="/">
            Nevermind
          </a>
          <a
            class="pure-button pure-button-primary"
            href="javascript:void(0)"
            onclick=${login}>
            Done
          </a>
        </div>
      </div>
    </div>
  </div>
  `;
}

export default {model, view};