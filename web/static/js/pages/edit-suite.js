import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import {
  putIn, updateIn, errorClass
}
from '../util';
import queryString from 'query-string';
import select from "./widgets/select";
import keyvalue from "./widgets/key-value";
import loader from './widgets/loader';
import errorView from './widgets/error';
import successView from './widgets/success-floating';
import menu from './widgets/menu';
import flash from './widgets/flash';
import fieldError from './widgets/field-error';


function emptySuite() {
  return {
    name: 'Empty Suite',
    description: 'empty',
    trigger: {
      kind: 'interval',
      opts: {
        interval: 5,
        unit: 'day'
      }
    }
  };
}


function newRequest() {
  return {
    method: 'GET',
    verified: true,
    path: "https://foo.com/bar/baz",
    params: {
      "qux": 42
    },
    body: '',
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

function model(store) {
  return {
    state: {
      suite: false,
      error: false
    },
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
      updateStepDuration,
      updateMinConcurrency,
      updateStepSize,
      updateMaxConcurrency,
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
      createRequest: _.partial(createRequest, store),
      updateRequest: _.partial(updateRequest, store),
      createRun: _.partial(createRun, store),
    },
  }
}

function triggerChange(kind, state) {
  let suite = state.suite;
  let trigger = {
    kind, opts: {}
  };
  suite = {...suite, trigger
  };
  return {...state, suite
  };
}

function getSuite(store, {
  id
}, state, send, done) {
  store.get('suite', {
    id
  })
    .on('error', (e) => send('edit:error', e, done))
    .on('ok', (suite) => send('edit:updateSuite', suite, done));
}

function saveSuite(store, _data, {
  suite
}, send, done) {
  store.update('suite', suite)
    .on('error', (e) => send('edit:error', e, done))
    .on('ok', (suite) => floatySuccess('Your suite has been updated', send, done));
}

function createRequest(store, request, state, send, done) {
  store.create('request', {...request, suite_id: state.suite.id
  })
    .on('error', (e) => send('edit:error', e, done))
    .on('ok', (request) => {
      send('edit:appendRequest', request, done);
      floatySuccess('Your request has been added', send, done);
    });
}

function updateRequest(store, request, state, send, done) {
  store.update('request', request)
    .on('error', (e) => send('edit:error', e, done))
    .on('ok', (request) => {
      floatySuccess('Your request has been updated', send, done);
    });
}

function createRun(store, _data, {suite}, send, done) {
  store.create('run', {
    suite_id: suite.id
  })
    .on('error', (e) => send('edit:error', e, done))
    .on('ok', (run) => {
      window.location.href = `/app/runs/${run.id}`;
    })
}

function floatySuccess(message, send, done) {
  send('edit:showSuccess', message, done);
  setTimeout(() => {
    send('edit:clearSuccess', done);
  }, 1500)
}

const save = _.debounce((send) => {
  send('edit:saveSuite');
}, 1000);

const saveRequest = _.debounce((send, request) => {
  send('edit:updateRequest', request);
}, 1000);

function updateSuite(suite, state) {
  return {...state, suite: suite
  };
}

function error(error, state) {
  return {...state, error: error
  };
}

function showSuccess(title, state) {
  return {...state,
    success: title,
    error: false
  };
}

function clearSuccess(_nothing, state) {
  return {...state, success: false
  };
}

function intervalChange(interval, state) {
  return putIn(state, 'suite.trigger.opts.interval', parseInt(interval));
}

function intervalUnitChange(unit, state) {
  return putIn(state, 'suite.trigger.opts.unit', unit);
}

function appendRequest(request, state) {
  let requests = state.suite.requests.concat([request]);
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

function updateStepDuration({req, stepDuration}, state) {
  return updateIn(state, 'suite.requests.step_duration', req, stepDuration);  
}

function updateMinConcurrency({req, minConcurrency}, state) {
  return updateIn(state, 'suite.requests.min_concurrency', req, minConcurrency);
}

function updateStepSize({req, stepSize}, state) {
  return updateIn(state, 'suite.requests.step_size', req, stepSize);
}

function updateMaxConcurrency({req, maxConcurrency}, state) {
  return updateIn(state, 'suite.requests.max_concurrency', req, maxConcurrency);
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

function manualTriggerView(suite, send) {}

function genWebhookUrl(suite) {
  return 'TODO webhook url'
}

function gitTriggerView(suite, send) {
  return html `
    <div>
      <h4>Add this webhook url to your github config</h4>
      <div class="mono">
        ${genWebhookUrl(suite)}
      </div>
    </div>
  `
}

function intervalTriggerView(suite, send) {
  return html `
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
      suite.trigger.opts.unit
      )
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
  let {
    suite: suite
  } = state;
  return html `
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
  const {
    headers
  } = req;

  const dispatch = (newHeaders) => {
    send('edit:updateReqHeaders', {
      req, headers: newHeaders
    });
    saveRequest(send, req);
  };

  return keyvalue(
    'Headers',
    headers,
    dispatch,
    req.headersShowing, () => send('edit:toggleHeadersView', {
      req
    })
  );
}

function queryParamView(req, send) {
  const {
    params
  } = req;

  const dispatch = (params) => {
    send('edit:updateReqParams', {
      req, params
    });
    saveRequest(send, req);
  }

  return keyvalue(
    'Query Parameters',
    params,
    dispatch,
    req.paramsShowing, () => send('edit:toggleParamsView', {
      req
    })
  );
}

function bodyView(req, send) {
  const {
    method
  } = req;
  if (method === 'GET' || method === 'DELETE') return;
  const render = () => {
    const onchange = (e) => {
      send('edit:updateReqBody', {
        req, body: e.target.value
      });
      saveRequest(send, req);
    };

    if (!req.bodyShowing) return '';
    return html `
      <textarea onchange=${onchange}>${req.body}</textarea>
    `
  };

  return html `
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

function requestView(state, req, send) {
  const qs = queryString.stringify(req.params);
  const toggleRequest = () => {
    send('edit:toggleRequestView', {
      req
    });
  };

  const onPathChange = (e) => {
    send('edit:updateReqPath', {
      req, path: e.target.value
    });
    saveRequest(send, req);
  };
  const onStepDurationChange = (e) => {
    send('edit:updateStepDuration', {
      req, stepDuration: (e.target.value * 1000)
    });
    saveRequest(send, req);
  }
  const onMinConcurrencyChange = (e) => {
    send('edit:updateMinConcurrency', {
      req, minConcurrency: e.target.value
    });
    saveRequest(send, req);
  }
  const onStepSizeChange = (e) => {
    send('edit:updateStepSize', {
      req, stepSize: e.target.value
    });
    saveRequest(send, req);
  }
  const onMaxConcurrencyChange = (e) => {
    send('edit:updateMaxConcurrency', {
      req, maxConcurrency: e.target.value
    });
    saveRequest(send, req);
  }

  const render = () => {
    if (!req.isShowing) return;

    return html `
    <div class="request-options pure-form pure-form-aligned">
      <div class="method-path">
        <div class="method pure-control-group">
          <label>Method</label>
          ${
            select({
                'GET': 'GET',
                'POST': 'POST',
                'DELETE': 'DELETE',
                'PUT': 'PUT',
                'PATCH': 'PATCH'
              },
              (e) => {
                send('edit:updateReqMethod', {
                  req,
                  to: e.target.value
                });
                saveRequest(send, req);
              },
              req.method,
              {
                'class': 'select-method'
              }
            )
          }
          <input
            name="path"
            class="path"
            value="${req.path}"
            onkeyup=${onPathChange}
          />
        </div>
      </div>
      <div class="request-options">
        <div class="run-length pure-control-group">
          ${fieldError(state, 'runlength')}
          <label>Run each level of concurrency for</label>
          <input
            min="1"
            step="1"
            name="concurrency run length"
            value="${req.step_duration / 1000}"
            onkeyup=${onStepDurationChange}
          />
          <label>seconds</label>

        </div>
        <div class="min-concurrency pure-control-group">
          <label>Min Concurrency</label>
          <input
            min="1"
            step="1"
            name="min concurrency"
            value="${req.min_concurrency}"
            onkeyup=${onMinConcurrencyChange}
          />
        </div>
        <div class="concurrency-step pure-control-group">
          <label>Concurrency step size</label>
          <input
            min="1"
            step="1"
            name="concurrency step size"
            value="${req.step_size}"
            onkeyup=${onStepSizeChange}
          />
        </div>
        <div class="max-concurrency pure-control-group">
          <label>Max Concurrency</label>
          <input
            min="1"
            step="1"
            name="max concurrency"
            value="${req.max_concurrency}"
            onkeyup=${onMaxConcurrencyChange}
          />
        </div>
      </div>


      ${headersView(req, send)}
      ${queryParamView(req, send)}
      ${bodyView(req, send)}
    </div>
    `;
  };

  return html `
    <div class="request">
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



function requestListView(state, send) {
  const requests = state.suite.requests;

  const appendRequest = () => {
    send('edit:createRequest', newRequest());
  }

  return html `
    <div class="separated requests">
      <div class="heading">
        <h4 class="text-muted">Run these requests</h4>

        <a href="javascript:void(0)"
          onclick=${appendRequest}
          class="pure-button pure-button-primary"
          >
          Add a Request
        </a>
      </div>


      ${requests.map((req) => requestView(state, req, send))}
    </div>
  `;
}


function suiteView(state, send) {
  const {
    suite: suite
  } = state;

  if (!suite) {
    return loader('Loading your suite');
  }

  const onChangeName = (e) => {
    send('edit:updateName', e.target.value);
    save(send)
  }

  const createRun = () => {
    send('edit:createRun');
  }

  return html `
  <div class="edit-suite">
    ${successView(state, state.success)}
    ${errorView(state, {hideFieldErrors: true})}
    <div class="heading">
      <h4 class="text-muted">${suite.name}</h4>

      <a href="javascript:void(0)"
        class="pure-button button-success"
        onclick=${createRun}
        >
        Run
      </a>
    </div>
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
        ${requestListView(state, send)}
      </fieldset>
    </form>
  </div>
  `
}


function view(appState, prev, send) {

  const {
    params
  } = appState;
  const getSuite = () => {
    send('edit:getSuite', params);
  }

  const {
    edit: state
  } = appState;
  return html `
    <div class="app" onload=${getSuite}>
      ${menu(appState, send)}
      <div class="content">
        ${flash(appState, send)}

        ${suiteView(state, send)}
      </div>
    </div>
  `
}

export
default {
  model, view, emptySuite
}