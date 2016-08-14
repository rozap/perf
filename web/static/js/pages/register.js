import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import loader from './widgets/loader';
import error from './widgets/error';
import successView from './widgets/success';
import fieldError from './widgets/field-error';
import menu from './widgets/menu';
import flash from './widgets/flash';

function model(store) {
  return {
    namespace: 'register',
    state: {
      error: false,
      success: false,
      password: null,
      email: null
    },
    reducers: {
      updateEmail,
      updatePassword,
      failure,
      success
    },
    effects: {
      create: _.partial(create, store)
    }
  }
}

function updatePassword(password, state) {
  return {...state, password: password};
}
function updateEmail(email, state) {
  return {...state, email: email};
}

function create(store, data, {email, password}, send, done) {
  store.create('user', {email, password})
  .on('error', (e) => send('register:failure', e, done))
  .on('ok', (me) => send('register:success', me, done));
}

function failure(reason, state) {
  return {...state, error: reason, success: false};
}

function success(_data, state) {
  return {...state, error: false, success: true};
}

function view(appState, prev, send) {
  const {register: state} = appState;

  const onUpdateEmail = (e) => {
    send('register:updateEmail', e.target.value);
  }
  const onUpdatePassword = (e) => {
    send('register:updatePassword', e.target.value);
  }
  const create = () => send('register:create');

  return html`
    <div class="app">

    ${menu(appState, send)}
    ${flash(appState, send)}

    <div class="constrained">
      <div class="pure-g">
        <div class="pure-u-1-1">
          <h2>Create an Account</h2>
        </div>
        ${error(state)}
        ${successView(state, 'Your account has been created. Check your email!')}
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
            onclick=${create}>
            Done
          </a>
        </div>
      </div>
    </div>
  </div>
  `;
}

export default {model, view};