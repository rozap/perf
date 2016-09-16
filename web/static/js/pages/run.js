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

function latencyChart({ndx, run}, send) {
  console.log("LatencyChart!")
  const el = document.createElement('div');
  window.chartEl = el;
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
  [".", ["bucket", 1000, "milliseconds"]],
  [".", ["where", ["==", ["row.type", "success"]]]],
  [".", ["maximum", ["-", ["row.end_t", "row.start_t"]], "max_latency"]],
  [".", ["minimum", ["-", ["row.end_t", "row.start_t"]], "min_latency"]],
  [".", ["percentile", ["-", ["row.end_t", "row.start_t"]], 99, "p95_latency"]],
  [".", ["percentile", ["-", ["row.end_t", "row.start_t"]], 75, "p75_latency"]],
  [".", ["percentile", ["-", ["row.end_t", "row.start_t"]], 50, "p50_latency"]],

  // [".", [
  //   "percentile", [
  //     '/', [
  //       "row.size",
  //       [
  //         "-", ["row.end_t", "row.start_t"]]
  //   ]],
  //   50,
  //   "p75_throughput"
  //   ]
  // ],
  [".", ["aggregates"]]
]

function summaryQuery(query) {
  return [
    [".", ["bucket", 220 * 1000, "milliseconds"]],
    ...query.slice(1)
  ]
}


function model(api, channelFactory) {
  var yam;
  var onYamChartChanges;
  var chart;

  const ndx = crossfilter([]);
  return {
    state: {
      query: q,
      run: false,
      hasLoaded: false,
      latencyChart: false,
      charts: [],
      records: [],
      summary: {events: []},
      ndx
    },
    namespace: 'run',
    reducers: {
      show,
      error,
      appendChart,
      resetChart,
      records,
      summary
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
        send('run:initChart', {}, done);
        send('run:initSummary', {}, done);
      },
      initChart: (params, state, send, done) => {
        if(yam) initChart(yam, params, state, send, done);
      },
      initSummary: (params, state, send, done) => {
        if(yam) initSummary(yam, params, state, send, done);
      },
      chartChanges: (query, state) => {
        yam.changes(query, onYamChartChanges);
      },
      summaryChanges: (query, state, send, done) => {
        yam.changes(query, (summary) => {
          send('run:summary', summary, done);
        })
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
        onYamChartChanges = (c) => {
          send('run:metricChange', c, done);
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

  const params = {startSeconds, endSeconds, query: summaryQuery(state.query)};

  yam.query(params)
  .on('error', (error) => send('run:error', error, done))
  .on('ok', (summary) => {
    send('run:summary', summary, done);
  });

  if(isInProgress(state.run)) {
    send('run:summaryChanges', params, done);
  }
}

function summary(summary, state) {
  return {...state, summary};
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

function summaryView({summary: {events}}) {
  if(!events.length) return;

  const agg = events[0].aggregations;
  return html`
    <div class="summary">
      <span class="text-muted">Summary</span>
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


function statusView({run}, send) {
  var finished = html `<span>In progress</span>`;
  if (!isInProgress(run)) {
    finished = html `<span>
      <span class="text-muted">Finished</span>
      <span>
        ${moment.utc(run.finished_at).format(defaultFormat)}
      </span>
    </span>`
  }

  return html`
    <div>
      <span class="text-muted">Started</span>
      <span>${moment.utc(run.inserted_at).format(defaultFormat)}</span>
    </div>
  `
}

function runView(state, send) {
  if (!state.hasLoaded) {
    return loader('Loading that run...');
  }
  if (!state.run) {
    return;
  }
  window.dc = dc;
  return html `
    <div>
      ${statusView}
      ${summaryView(state)}
      ${state.charts}
    </div>
  `
  // ${queryBuilderView(state.query)}
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