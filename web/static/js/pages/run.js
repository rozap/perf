import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import errorView from './widgets/error';
import menu from './widgets/menu';
import flash from './widgets/flash';
import loader from './widgets/loader';
import moment from 'moment';
import dc from 'dc';
import crossfilter from 'crossfilter';
import * as d3 from 'd3';

const defaultFormat = 'MM/DD/YYYY h:mm a'

class Loadable {
  constructor(thing) {
    this._error = false;
    if (thing) {
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

function dateToSeconds(date) {
  return moment.utc(date).unix();
}
function secondsToDate(seconds) {
  return moment(seconds * 1000);
}
function nanoToSeconds(nanos) {
  return nanos / (1000 * 1000);
}

function domainOf(run) {
  const duration = run.suite.requests.reduce((acc, req) => {
    return (req.runlength + (req.timeout / 1000) + (req.receive_timeout / 1000)) + acc;
  }, 0);
  const startSeconds = dateToSeconds(run.inserted_at);
  const endSeconds = startSeconds + duration;

  return {
    startSeconds,
    endSeconds,
    duration
  }
}

var i = 0;
function latencyChart({ndx, run}, send) {
  const el = document.createElement('div');
  const chart = dc.seriesChart(el);


  const {
    startSeconds, endSeconds
  } = domainOf(run)

  const start = startSeconds*1000;
  const end = endSeconds*1000;

  // const latencyDimension = ndx.filter((d) => d[0] === 'latency')

  var measureDimension = ndx.dimension((d) => {
    return [d.at, d.measure]
  });
  const runGroup = measureDimension.group().reduceSum((d) => {
    return d.value;
  });

  // Domain should be start_time + runlength
  chart
    .width(768)
    .height(480)
    .chart(function(c) {
      return dc
      .lineChart(c)
      .interpolate('basis-open');
    })
    .x(d3.scale.linear().domain([start, end]))
    .brushOn(false)
    .yAxisLabel("Latency, ms")
    .xAxisLabel("Time")
    .clipPadding(10)
    .elasticY(true)
    .dimension(measureDimension)
    .group(runGroup)
    .mouseZoomable(false)
    .seriesAccessor((d) => d.key[1])
    .keyAccessor((d) => d.key[0])
    .valueAccessor((d) => d.value)

  chart.xAxis().tickFormat((d) => {
    return 't' + (d - start) / 1000;
  });

  chart.yAxis().tickFormat((d) => {
    return d3.format(',d')(d);
  });
  chart.margins().left += 40;

  dc.renderAll();

  return {
    latencyChart: el
  };
}


const q = [
  [".", ["bucket", 500, "milliseconds"]],
  [".", ["where", ["==", ["row.type", "success"]]]],
  // [".", ["percentile", ["-", ["row.end_t", "row.start_t"]], 99, "p95_latency"]],
  // [".", ["percentile", ["-", ["row.end_t", "row.start_t"]], 75, "p75_latency"]],
  // [".", ["percentile", ["-", ["row.end_t", "row.start_t"]], 50, "p50_latency"]],
  
  [".", [
    "percentile", [
      '/', [
        "row.size",
        [
          "-", ["row.end_t", "row.start_t"]]
    ]], 
    50, 
    "p75_throughput"
    ]
  ],
  [".", ["aggregates"]]
]


function model(api, channelFactory) {
  var yam;
  var onYamChanges;
  var chart;

  const ndx = crossfilter([]);
  window.ndx = ndx;
  return {
    state: {
      query: q,
      run: false,
      hasLoaded: false,
      latencyChart: false,
      ndx
    },
    namespace: 'run',
    reducers: {
      show,
      error,
      setChart: (chart, state) => {
        return {...state, ...chart};
      }
    },
    effects: {
      getRun: _.partial(getRun, api),
      initYam: (run, state, send, done) => {
        yam = channelFactory.create('yams', {
          run_id: run.id
        });
        yam.on('connected', () => {
          send('run:yamConnected', {}, done)
        });
      },
      yamConnected: (_params, state, send, done) => {
        send('run:initChart', {}, done)
      },
      initChart: (_params, state, send, done) => {
        send('run:onChartInit', latencyChart(state, send), done);

        const {
          startSeconds,
          endSeconds
        } = domainOf(state.run);

        send('run:query', {startSeconds, endSeconds, query: state.query}, done);
      },
      onChartInit: (chart, state, send, done) => {
        send('run:setChart', chart, done);
      },

      query: (params, state, send, done) => {
        if (yam) {
          query(yam, params, state, send, done)
        }
      },
      changes: (_, state) => {
        yam.changes(state.query, onYamChanges);
      },
      change: ({events}, state, send, done) => {
        console.log(events)
        const records = _.flatten(events.map((e) => {
          return _.map(e.aggregations, (value, key) => {
            return {
              at: e.end_t,
              measure: key,
              value: value,
            }
          })
        }))
        state.ndx.add(records);
        dc.redrawAll();
      }
    },
    subscriptions: [
      (send, done) => {
        onYamChanges = (c) => {
          send('run:change', c, done);
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

function query(yam, params, state, send, done) {
  yam.query(params)
    .on('error', (error) => send('run:error', error, done))
    .on('ok', (resp) => {
      console.log(resp);
      send('run:change', resp, done);
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
  if (!state.hasLoaded) {
    return loader('Loading that run...');
  }
  if (!state.run) {
    return;
  }
  const {
    run
  } = state;

  if (isInProgress(run)) {
    send('run:changes')
  }

  var finished = html `<span>In progress</span>`;
  if (!isInProgress(run)) {
    finished = html `<span>
      <span class="text-muted">Finished</span>
      <span>
        ${moment.utc(run.finished_at).format(defaultFormat)}
      </span>
    </span>`
  }

  return html `
    <div>
      <h5>
        <span class="text-muted">Started</span>
        <span>${moment.utc(run.inserted_at).format(defaultFormat)}</span>
        ${finished}
        ${state.latencyChart}
      </h5>
    </div>
  `
}

function view(appState, prev, send) {
  const {
    params, run: state
  } = appState;

  if (!state.hasLoaded) {
    send('run:getRun', params);
  }

  return html `
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

export
default {
  model, view
}