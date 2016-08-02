import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import {putIn, updateIn, errorClass} from '../util';
import queryString from'query-string';
import select from "./widgets/select";
import keyvalue from "./widgets/key-value";

const aRequest = {
    method: 'GET',
    protocol: 'https://',
    host: {
      verified: true,
      name: 'foo.com'
    },
    uri: "/bar/baz",
    params: {"qux": 42},
    body: {},
    headers: {
      'Content-Type': 'application/json'
    },
    concurrency: 47,
    runlength: 60
  }

const emptySuite = {
  name: '',
  description: '',
  trigger: {
    kind: 'interval',
    opts: {
      interval: 5,
      unit: 'day'
    }
  },
  requests: [aRequest],
  viewState: {
    headerKV: {isShowing: false},
    paramKV: {isShowing: false},
  }
}

function model(store) {
  return {
    state: { suite: emptySuite, error: false },
    namespace: 'edit',
    subscriptions: [],
    reducers: {
      triggerChange,
      intervalChange,
      intervalUnitChange,
      appendRequest,
      updateReqHeaders,
      updateReqParams,
      toggleHeadersView,
      toggleParamsView
    },
    effects: {
    }
  }
}

function triggerChange(kind, state) {
  let suite = state.suite;
  let trigger = {kind, opts: {}};
  suite = {...suite, trigger};
  return {...state, suite};
}

function intervalChange(interval, state) {
  return putIn(state, 'suite.trigger.opts.interval', parseInt(interval));
}

function intervalUnitChange(unit, state) {
  return putIn(state, 'suite.trigger.opts.unit', unit);
}

function appendRequest(data, state) {
  let requests = state.suite.requests.concat([aRequest]);
  return putIn(state, 'suite.requests', requests);
}

function updateReqHeaders({req: changedReq, headers}, state) {
  const requests = state.suite.requests.map((req) => {
    if(_.isEqual(req, changedReq)) {
      req.headers = headers;
    }
    return req;
  })
  return putIn(state, 'suite.requests', requests)
}

function updateReqParams({req: changedReq, params}, state) {
  const requests = state.suite.requests.map((req) => {
    if(_.isEqual(req, changedReq)) {
      req.params = params;
    };
    return req;
  })
  return putIn(state, 'suite.requests', requests);
}

function toggleHeadersView(_data, state) {
  return putIn(state, 'suite.viewState.headerKV.isShowing', !state.suite.viewState.headerKV.isShowing);
}

function toggleParamsView(_data, state) {
  return putIn(state, 'suite.viewState.paramKV.isShowing', !state.suite.viewState.paramKV.isShowing);
}


function manualTriggerView(suite, send) {
}

function genWebhookUrl(suite) {
  return 'TODO webhook url'
}

function gitTriggerView(suite, send) {
  return html`
    <div class="edit-trigger">
      <h4>Add this webhook url to your github config</h4>
      <div class="mono">
        ${genWebhookUrl(suite)}
      </div>
    </div>
  `
}

function intervalTriggerView(suite, send) {
  return html`
    <div class="edit-trigger">
      <span>Run this suite every</span>
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


function headersView(req, viewState, send) {
  const {headers} = req;

  const dispatch = (newHeaders) => {
    send('edit:updateReqHeaders', {req, headers: newHeaders});
  };

  return keyvalue(
    'Headers',
    headers,
    dispatch,
    viewState.headerKV,
    () => send('edit:toggleHeadersView')
  );
}

function queryParamView(req, viewState, send) {
  const {params} = req;

  const dispatch = (params) => {
    send('edit:updateReqParams', {req, params});
  }

  return keyvalue(
    'Query Parameters',
    params,
    dispatch,
    viewState.paramKV,
    () => send('edit:toggleParamsView')
  );
}

function requestView(req, viewState, send) {
  let qs = queryString.stringify(req.params);
  return html`
    <div class="pure-control-group request">
      ${
        select({
            'GET': 'GET',
            'POST': 'POST',
            'DELETE': 'DELETE',
            'PUT': 'PUT'
          },
          (e) => send('edit:requestMethodChange', {
            req,
            to: e.target.value
          }),
          req.method,
          {
            'class': 'select-method'
          }
        )
      }
      <span>${req.protocol}${req.host.name}${req.uri}?${qs}</span>

      ${headersView(req, viewState, send)}
      ${queryParamView(req, viewState, send)}
    </div>
  `
}

function requestListView({requests, viewState}, send) {
  return html`
    <div class="separated">
      <div class="pure-control-group">
        <a href="javascript:void(0)"
          onclick=${() => send('edit:appendRequest')}
          class="pure-button pure-button-primary"
          >
          Add Requests
        </a>
      </div>
      ${requests.map((req) => requestView(req, viewState, send))}
    </div>
  `;
}


function view({edit: state}, prev, send) {
  let {suite: suite} = state;
  return html`
    <main class="edit-suite">
      <div>
        <h1>New Suite</h1>
        <form class="pure-form pure-form-aligned">
          <fieldset>
            <div class="pure-control-group">
              <label for="name">Name</label>
              <input
                name="name"
                value="${suite.name}"
                placeholder="eg: 'users', 'analytics', etc" />
            </div>

            ${triggerView(state, send)}
            ${requestListView(suite, send)}
          </fieldset>
        </form>
      </div>
    </main>
  `
}

export default {
  model, view
}