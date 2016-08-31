import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import errorView from './widgets/error';
import menu from './widgets/menu';
import flash from './widgets/flash';
import loader from './widgets/loader';
import moment from 'moment';

const defaultFormat = 'MM/DD/YYYY h:mm a'

class Loadable {
  constructor(thing) {
    this._error = false;
    if(thing) {
      this.load(thing);
    } else {
      this.unload();
    }
  }

  isLoaded() {
    return this._isLoaded && !this._error;
  }

  isFailed() {
    return !!this.getError();
  }

  error(e) {
    this._error = e;
  }

  load(thing) {
    this._thing = thing;
    this._isLoaded = true;
  }

  unload() {
    this._thing = false;
    this._isLoaded = false;
  }

  get() {
    return this._thing;
  }

  getError() {
    return this._error;
  }
}

function model(api, channelFactory) {
  var yam;
  var onYamChanges;

  return {
    state: {
      run: false,
      hasLoaded: false
    },
    namespace: 'run',
    reducers: {
      show,
      error
    },
    effects: {
      getRun: _.partial(getRun, api),
      initYam: (run, state, send, done) => {
        yam = channelFactory.create('yams', {yam_ref: run.yam_ref});
      },
      slice: (params, state, send, done) => {
        if(yam) {
          slice(yam, params, state, send, done)
        }
      },
      changes: () => {
        console.warn("SUBSCRIBE TO CHANGES")
        yam.changes(onYamChanges);
      }

    },
    subscriptions: [
      (send, done) => {
        onYamChanges = (c) => {
          console.log("On change!", c)
        }
      }
    ]
  };
}

function isInProgress(run) {
  return !run.finished_at;
}

function getRun(api, {id}, state, send, done) {
  api.get('run', {id})
  .on('error', (error) => send('run:error', error, done))
  .on('ok', (resp) => {
    send('run:show', resp, done);
    send('run:initYam', resp, done);
  });
}

function slice(yam, params, state, send, done) {
  yam.slice(params)
  .on('error', (error) => send('run:error', error, done))
  .on('ok', (resp) => {
    console.log("Got slice", resp);
  })
}


function show(run, state) {
  return {
    ...state,
    hasLoaded: true,
    run
  }
}

function error(error, state) {
  return {
    ...state,
    hasLoaded: true,
    error: error
  }
}


function runView(state, send) {
  if(!state.hasLoaded) {
    return loader('Loading that run...');
  }
  if(!state.run) {
    return;
  }
  const {run} = state;

  if(isInProgress(run)) {
    send('run:changes')
  }

  var finished = html`<span>In progress</span>`;
  if(!isInProgress(run)) {
    finished = html`<span>
      <span class="text-muted">Finished</span>
      <span>
        ${moment.utc(run.finished_at).format(defaultFormat)}
      </span>
    </span>`
  }

  return html`
    <div>
      <h5>
        <span class="text-muted">Started</span>
        <span>${moment.utc(run.inserted_at).format(defaultFormat)}</span>
        ${finished}
      </h5>
    </div>
  `
}

function view(appState, prev, send) {
  const {params, run: state} = appState;

  if(!state.hasLoaded) {
    send('run:getRun', params);
  }

  return html`
    <div class="app">
      ${menu(appState, send)}
      ${flash(appState, send)}

      <div class="content">
        ${flash(state, send)}
        <div class="run-body">
          ${runView(state, send)}
        </div>
      </div>
    </div>
  `
}

export default {
  model, view
}