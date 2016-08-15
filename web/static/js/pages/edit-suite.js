import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import {putIn, updateIn, errorClass} from '../util';
import queryString from'query-string';
import select from "./widgets/select";
import keyvalue from "./widgets/key-value";
import loader from './widgets/loader';
import errorView from './widgets/error';
import successView from './widgets/success-floating';
import menu from './widgets/menu';
import flash from './widgets/flash';


function emptySuite() {
  return {
    name: 'Empty Suite',
    description: '',
    trigger: {
      kind: 'interval',
      opts: {
        interval: 5,
        unit: 'day'
      }
    },
    requests: []
  };
}

function model(store) {
  return {
    state: { suite: false, error: false },
    namespace: 'edit',
    reducers: {
      updateName,
      triggerChange,
      intervalChange,
      intervalUnitChange,
      appendRequest,
      updateReqHeaders,
      updateReqParams,
      updateReqMethod,
      updateReqBody,
      updateReqPath,
      toggleHeadersView,
      toggleParamsView,
      toggleBodyView,
      toggleRequestView,
      error,
      updateSuite, 
      showSuccess,
      clearSuccess
    },
    effects: {
      getSuite: _.partial(getSuite, store),
      saveSuite: _.partial(saveSuite, store),
      success
    },
  }
}

function triggerChange(kind, state) {
  let suite = state.suite;
  let trigger = {kind, opts: {}};
  suite = {...suite, trigger};
  return {...state, suite};
}

function getSuite(store, {id}, state, send, done) {
  store.get('suite', {id})
  .on('error', (e) => send('edit:error', e, done))
  .on('ok', (suite) => send('edit:updateSuite', suite, done));
}

function saveSuite(store, _data, {suite}, send, done) {
  store.update('suite', suite)
  .on('error', (e) => send('edit:error', e, done))
  .on('ok', (suite) => send('edit:success', 'Your suite has been updated', done));
}

const save = _.debounce((send) => {
  send('edit:saveSuite');
}, 500);

function updateSuite(suite, state) {
  return {...state, suite: suite};
}

function error(error, state) {
  return {...state, error: error};
}
function showSuccess(title, state) {
  return {...state, success: title};
}
function clearSuccess(_nothing, state) {
  return {...state, success: false};
}
function success(title, state, send, done) {
  send('edit:showSuccess', title, done);
  setTimeout(() => {
    // send('edit:clearSuccess', {}, done);
  }, 2000)
}


function newRequest() {
  return {
    method: 'GET',
    verified: true,
    path: "https://foo.com/bar/baz",
    params: {"qux": 42},
    body: {},
    headers: {
      'Content-Type': 'application/json'
    },
    concurrency: 47,
    runlength: 60,

    isShowing: true,
    headersShowing: false,
    paramsShowing: false,
    bodyShowing: false,
  }
}

function intervalChange(interval, state) {
  return putIn(state, 'suite.trigger.opts.interval', parseInt(interval));
}

function intervalUnitChange(unit, state) {
  return putIn(state, 'suite.trigger.opts.unit', unit);
}

function appendRequest(data, state) {
  let requests = state.suite.requests.concat([newRequest()]);
  return putIn(state, 'suite.requests', requests);
}

function updateName(name, state) {
  return putIn(state, 'suite.name', name);
}

function updateReqMethod({req, to}, state) {
  return updateIn(state, 'suite.requests.method', req, to);
}

function updateReqHeaders({req, headers}, state) {
  return updateIn(state, 'suite.requests.headers', req, headers);
}

function updateReqParams({req, params}, state) {
  return updateIn(state, 'suite.requests.params', req, params);
}

function updateReqBody({req, body}, state) {
  return updateIn(state, 'suite.requests.body', req, body);
}

function updateReqPath({req, path}, state) {
  return updateIn(state, 'suite.requests.path', req, path);
}

function toggleHeadersView({req}, state) {
  return updateIn(state, 'suite.requests.headersShowing', req, !req.headersShowing);
}

function toggleParamsView({req}, state) {
  return updateIn(state, 'suite.requests.paramsShowing', req, !req.paramsShowing);
}

function toggleBodyView({req}, state) {
  return updateIn(state, 'suite.requests.bodyShowing', req, !req.bodyShowing);
}

function toggleRequestView({req}, state) {
  return updateIn(state, 'suite.requests.isShowing', req, !req.isShowing);
}

function manualTriggerView(suite, send) {
}

function genWebhookUrl(suite) {
  return 'TODO webhook url'
}

function gitTriggerView(suite, send) {
  return html`
    <div>
      <h4>Add this webhook url to your github config</h4>
      <div class="mono">
        ${genWebhookUrl(suite)}
      </div>
    </div>
  `
}

function intervalTriggerView(suite, send) {
  return html`
  <div>
    <label >Run this suite every</label>
    <input
      value=${suite.trigger.opts.interval || ''}
      onblur=${(e) => {
      send('edit:intervalChange', e.target.value)
    }} placeholder="eg: 4"/>

    ${
      select({
        week: 'Weeks',
        day: 'Days',
        hour: 'Hours',
        minute: 'Minutes'
      },
      (e) => send('edit:intervalUnitChange', e.target.value),
      suite.trigger.opts.unit)
    }
  </div>
  `
}


const triggers = {
  'manual': manualTriggerView,
  'git': gitTriggerView,
  'interval': intervalTriggerView
}

function triggerView(state, send) {
  let {suite: suite} = state;
  return html`
    <div class="pure-control-group">
      <label class="inline ${errorClass('trigger', state)}"
        for="trigger">
          Trigger on
      </label>

      ${
        select({
          manual: 'Manual',
          git: 'Github change',
          interval: 'Interval'
        },
        (e) => send('edit:triggerChange', e.target.value),
        suite.trigger.kind
      )}

      <div class="edit-trigger">
        ${triggers[suite.trigger.kind](suite, send)}
      </div>
    </div>
  `
}

function headersView(req, send) {
  const {headers} = req;

  const dispatch = (newHeaders) => {
    send('edit:updateReqHeaders', {req, headers: newHeaders});
  };

  return keyvalue(
    'Headers',
    headers,
    dispatch,
    req.headersShowing,
    () => send('edit:toggleHeadersView', {req})
  );
}

function queryParamView(req, send) {
  const {params} = req;

  const dispatch = (params) => {
    send('edit:updateReqParams', {req, params});
  }

  return keyvalue(
    'Query Parameters',
    params,
    dispatch,
    req.paramsShowing,
    () => send('edit:toggleParamsView', {req})
  );
}

function bodyView(req, send) {
  const {method} = req;
  if(method === 'GET' || method === 'DELETE') return;
  const render = () => {
    const onchange = (e) => {
      send('edit:updateReqBody', {req, body: e.target.value});
    };

    if(!req.bodyShowing) return '';
    return html`
      <textarea onchange=${onchange}>${req.body}</textarea>
    `
  };

  return html`
    <div class="request-body">
      <h5>
        <a href="javascript:void(0)"
          onclick=${() => send('edit:toggleBodyView', {req})}>
          <i class="ion-ios-arrow-${req.bodyShowing? 'down': 'right'}"></i>
          Body
        </a>
      </h5>
      ${render()}
    </div>
  `
}

function requestView(req, send) {
  const qs = queryString.stringify(req.params);
  const toggleRequest = () => {
    send('edit:toggleRequestView', {req});
  };

  const onPathChange = (e) => {
    send('edit:updateReqPath', {req, path: e.target.value});
  };

  const render = () => {
    if(!req.isShowing) return;

    return html`
    <div>
      <div class="pure-u-1-3">
        <label>Method</label>
        ${
          select({
              'GET': 'GET',
              'POST': 'POST',
              'DELETE': 'DELETE',
              'PUT': 'PUT',
              'PATCH': 'PATCH'
            },
            (e) => send('edit:updateReqMethod', {
              req,
              to: e.target.value
            }),
            req.method,
            {
              'class': 'select-method'
            }
          )
        }
      </div>

      <input
        name="path"
        class="path pure-input-2-3"
        value="${req.path}"
        onkeyup=${onPathChange}
      />

      ${headersView(req, send)}
      ${queryParamView(req, send)}
      ${bodyView(req, send)}
    </div>
    `;
  };

  return html`
    <div class="pure-control-group request">
      <h4>
        <a href="javascript:void(0)"
          onclick=${toggleRequest}>
          <i class="ion-ios-arrow-${req.isShowing? 'down': 'right'}"></i>
          ${req.path}?${qs}
        </a>
      </h4>

      ${render()}
    </div>
  `
}

function requestListView({requests}, send) {
  return html`
    <div class="separated">
      <div class="pure-control-group">
        <a href="javascript:void(0)"
          onclick=${() => send('edit:appendRequest')}
          class="pure-button pure-button-primary"
          >
          Add a Request
        </a>
      </div>
      ${requests.map((req) => requestView(req, send))}
    </div>
  `;
}


function suiteView(state, send) {
  const {suite: suite} = state;

  if(!suite) {
    return loader('Loading your suite');
  }

  const onChangeName = (e) => {
    send('edit:updateName', e.target.value);
    save(send)
  }

  return html`
  <div class="content">
    <h1>${suite.name || '???'}</h1>
    ${successView(state, state.success)}
    ${errorView(state)}
    <form class="pure-form pure-form-aligned">
      <fieldset>
        <div class="pure-control-group">
          <label for="name">Name</label>
          <input
            name="name"
            onkeyup=${onChangeName}
            value="${suite.name}"
            placeholder="eg: 'users', 'analytics', etc" />
        </div>

        ${triggerView(state, send)}
        ${requestListView(suite, send)}
      </fieldset>
    </form>
  </div>
  `
}


function view(appState, prev, send) {

  const {params} = appState;
  const getSuite = () => {
    console.log("Getting suite")
    send('edit:getSuite', params);
  }

  const {edit: state} = appState;
  return html`
    <div class="app edit-suite" onload=${getSuite}>
      ${menu(appState, send)}
      ${flash(appState, send)}

      ${suiteView(state, send)}
    </div>
  `
}

export default {
  model, view, emptySuite
}