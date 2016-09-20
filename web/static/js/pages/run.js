import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import errorView from './widgets/error';
import menu from './widgets/menu';
import flash from './widgets/flash';
import loader from './widgets/loader';
import queryBuilderView from './widgets/query-builder';
import {formatTime} from '../util';
import moment from 'moment';
import dc from 'dc';
import crossfilter from 'crossfilter';
import * as d3 from 'd3';

const defaultFormat = 'MM/DD/YYYY h:mm a'


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
  const startSeconds = dateToSeconds(run.started_at);
  const endSeconds = startSeconds + (run.duration / 1000);

  return {
    startSeconds,
    endSeconds,
    duration: run.duration
  }
}

function latencyChart({ndx, run}, send) {
  const el = document.createElement('div');
  const chart = dc.seriesChart(el);
  const {
    startSeconds, endSeconds
  } = domainOf(run)

  const start = startSeconds*1000;
  const end = endSeconds*1000;

  var measureDimension = ndx.dimension((d) => {
    return [d.at, d.measure]
  });
  const runGroup = measureDimension.group().reduceSum((d) => {
    return d.value;
  });

  const width = document.body.clientWidth - 100;

  // Domain should be start_time + runlength
  chart
    .width(width)
    .height(width / 3)
    .chart(function(c) {
      return dc
      .lineChart(c)
      .interpolate('basis-open');
    })
    .x(d3.scale.linear().domain([start, end]))
    .brushOn(false)
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

  return el;
}


const q = [
  [".", ["bucket", 60 * 1000, "milliseconds"]],
  [".", ["where", ["==", ["row.type", "success"]]]],
  [".", ["maximum", ["-", ["row.end_t", "row.start_t"]], "max_latency"]],
  // [".", ["minimum", ["-", ["row.end_t", "row.start_t"]], "min_latency"]],
  // [".", ["percentile", ["-", ["row.end_t", "row.start_t"]], 99, "p95_latency"]],
  // [".", ["percentile", ["-", ["row.end_t", "row.start_t"]], 75, "p75_latency"]],
  // [".", ["percentile", ["-", ["row.end_t", "row.start_t"]], 50, "p50_latency"]],
  [".", ["aggregates"]]
]

function summaryQuery(run, query) {
  const {duration} = domainOf(run);
  return [
    [".", ["bucket", duration, "seconds"]],
    ...query.slice(1)
  ]
}


function statusQuery(run) {
  const {duration} = domainOf(run);
  return [
    [".", ["bucket", duration, "seconds"]],
    [".", ["count_where", ["==", ["row.type", "success"]], "success_count"]],
    [".", ["count_where", ["==", ["row.type", "error"]], "error_count"]],
    [".", [
      "count_where", [
        "&&", [
          [">=", ["row.status", 200]],
          ["<", ["row.status", 300]]
        ]
      ],
      "2xx_count"]
    ],
    [".", [
      "count_where", [
        "&&", [
          [">=", ["row.status", 400]],
          ["<", ["row.status", 500]]
        ]
      ],
      "4xx_count"]
    ],
    [".", [
      "count_where", [
        "&&", [
          [">=", ["row.status", 500]],
          ["<", ["row.status", 600]]
        ]
      ],
      "5xx_count"]
    ],
    [".", ["aggregates"]]
  ]
}

function rolling(query) {
  return [
    [".", ["bucket", 5000, "milliseconds"]],
    ...query.slice(1)
  ]
}

function model(api, channelFactory) {
  var yam;
  var onYamChartChanges;
  var onYamSummaryChanges;
  var onYamStatusChanges;
  var chart;

  const ndx = crossfilter([]);
  return {
    state: {
      query: q,
      run: false,
      isLoading: false,
      latencyChart: false,
      charts: [],
      records: [],
      summary: {events: []},
      status: {events: []},
      ndx
    },
    namespace: 'run',
    reducers: {
      show,
      error,
      appendChart,
      resetChart,
      records,
      summary,
      status
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
        console.log("Yam is connected!")
        send('run:initChart', {}, done);
        send('run:initSummary', {}, done);
        send('run:initStatii', {}, done);
      },
      initChart: (params, state, send, done) => {
        if(yam) initChart(yam, params, state, send, done);
      },
      initSummary: (params, state, send, done) => {
        if(yam) initSummary(yam, params, state, send, done);
      },
      initStatii: (params, state, send, done) => {
        if(yam) initStatii(yam, params, state, send, done);
      },
      chartChanges: (query, state) => {
        yam.changes(query, onYamChartChanges);
      },
      summaryChanges: (query, state, send, done) => {
        yam.changes(query, onYamSummaryChanges);
      },
      statusChanges: (query, state, send, done) => {
        yam.changes(query, onYamStatusChanges);
      },
      metricChange: ({events}, state, send, done) => {
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
        send('run:records', records, done);
      }
    },
    subscriptions: [
      (send, done) => {
        onYamChartChanges = (c) => send('run:metricChange', c, done);
        onYamSummaryChanges = (c) => send('run:summary', c, done);
        onYamStatusChanges = (c) => send('run:status', c, done);
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
    .on('ok', (run) => {
      send('run:show', run, done);
      send('run:initYam', run, done);
    });
}

function initChart(yam, _params, state, send, done) {
  send('run:resetChart', done);
  send('run:appendChart', latencyChart(state, send), done);

  const {
    startSeconds,
    endSeconds
  } = domainOf(state.run);

  const params = {startSeconds, endSeconds, query: state.query};

  yam.query(params)
  .on('error', (error) => send('run:error', error, done))
  .on('ok', (resp) => {
    send('run:metricChange', resp, done);
  });

  if (isInProgress(state.run)) {
    send('run:chartChanges', params, done);
  }
}

function initSummary(yam, _params, state, send, done) {
  const {
    startSeconds,
    endSeconds,
  } = domainOf(state.run);

  const params = {startSeconds, endSeconds, query: summaryQuery(state.run, state.query)};

  yam.query(params)
  .on('error', (error) => send('run:error', error, done))
  .on('ok', (summary) => {
    send('run:summary', summary, done);
  });

  if(isInProgress(state.run)) {
    send('run:summaryChanges', {startSeconds, endSeconds, query: rolling(summaryQuery(state.run, state.query))}, done);
  }
}

function initStatii(yam, _params, state, send, done) {
  const {
    startSeconds,
    endSeconds,
  } = domainOf(state.run);

  const params = {startSeconds, endSeconds, query: statusQuery(state.run)};

  yam.query(params)
  .on('error', (error) => send('run:error', error, done))
  .on('ok', (status) => {
    send('run:status', status, done);
  });

  if(isInProgress(state.run)) {
    send('run:statusChanges', {startSeconds, endSeconds, query: rolling(statusQuery(state.run))}, done);
  }
}


function summary(summary, state) {
  return {...state, summary};
}

function status(status, state) {
  console.log("Got a new status", status);
  return {...state, status};
}


function records(records, state) {
  return {...state, records};
}

function resetChart(_, state) {
  return {...state, charts: []};
}

function appendChart(el, state) {
  return {...state, charts: [...state.charts, el]};
}

function show(run, state) {
  return {
      ...state,
    isLoading: false,
    run
  }
}

function error(error, state) {
  return {
      ...state,
    isLoading: false,
    error: error
  }
}

function statiiView({status: {events}}) {
  if(!events.length) return;
  const agg = events[0].aggregations;

  return html`
  <div class="statii">
    <label class="toplevel text-muted">Statii</label>
    ${
      _.map(agg, (value, key) => {
        const name = key.split('_').join(' ');
        return html`
          <span class="stat">
            ${name} ${value}
          </span>
        `
      })
    }
  </div>
  `
}

function summaryView({summary: {events}}) {
  if(!events.length) return;

  const agg = events[0].aggregations;
  return html`
    <div class="summary">
      <label class="toplevel text-muted">Summary</label>
      ${
        _.map(agg, (value, key) => {
          const name = key.split('_').join(' ');
          const formatted = formatTime(value);

          return html`
            <span class="stat">
              ${name} ${formatted}
            </span>
          `
        })
      }
    </div>
  `
}


function progressView({run}, send) {
  var finished = html `<span>In progress</span>`;
  if (!isInProgress(run)) {
    finished = html `<span>
      <label class="toplevel text-muted">Finished</label>
      <span class="stat">
        ${moment.utc(run.finished_at).format(defaultFormat)}
      </span>
    </span>`
  }

  return html`
    <div class="suite-progress">
      <label class="toplevel text-muted">Started</label>
      <span class="stat">${moment.utc(run.inserted_at).format(defaultFormat)}</span>
    </div>
  `
}

function runView(state, send) {
  if (state.shouldLoad) {
    return loader('Loading that run...');
  }
  if (!state.run) {
    return;
  }
  return html `
    <div>
      ${progressView(state)}
      ${statiiView(state)}
      ${summaryView(state)}
      ${state.charts}
    </div>
  `
  // ${queryBuilderView(state.query)}
}

//TODO: make this match the route nav
function shouldLoad(appState) {
  return !appState.run.run && !appState.run.isLoading;
}

function view(appState, prev, send) {
  const {
    params, run: state
  } = appState;

  if (shouldLoad(appState)) {
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