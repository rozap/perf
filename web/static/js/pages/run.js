import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import errorView from './widgets/error';
import menu from './widgets/menu';
import flash from './widgets/flash';
import loader from './widgets/loader';
import queryBuilderView from './widgets/query-builder';
import moment from 'moment';
import {utcFormat, domainOf, timeFormat, millisFormat} from '../time';
import cjs from 'chart.js';


function latencyChart({run}, send) {
  const el = document.createElement('div');
  el.setAttribute('class', 'chart-container')
  var canvas = document.createElement('canvas');

  el.isSameNode = (other) => {
    // console.log("Is same", el, other);
    return other.className === el.className;
  }

  var w = document.body.clientWidth - 32;
  var h = 500;

  canvas.setAttribute("style", `width: ${w}px; height: ${h}px`);
  canvas.width = w;
  canvas.height = h;
  canvas.setAttribute('width', `${w}px`);
  canvas.setAttribute('height', `${h}px`);
  el.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var chart = new Chart(ctx, {
    type: 'line',
    options: {
      responsive: false,
      animation: {
        duration: 500,
      },
      tooltips: {
        mode: "x-axis",
        callbacks: {
          label: ({yLabel}) => millisFormat(yLabel)
        }
      },
      scales: {
        yAxes: [{
          ticks: {
            callback: (value) => millisFormat(value)
          }
        }],
        xAxes: [{
          ticks: {
            maxTicksLimit: 16,
            callback: (value, index) => {
              const point = chart.data.datasets[0].data[index];
              if(point) {
                return timeFormat(point.x);
              }
              return false;
            }
          }
        }]
      }
    },
    data: {
      labels: [],
      datasets: []
    }
  });

  const update = (datasets) => {
    if(datasets) {
      datasets = datasets.sort((a, b) => {
        if(a.label.indexOf("min") !== -1) {
          return -1;
        }
        if(b.label.indexOf("min") !== -1) {
          return 1;
        }
        if(a.label.indexOf("max") !== -1) {
          return 1;
        }
        if(b.label.indexOf("max") !== -1) {
          return -1;
        }
        if(a.label > b.label) {
          return 1;
        }
      });

      chart.data.datasets = datasets;

      const pallette = [
        ['rgba(246, 81, 29, 1)', 'rgba(246, 81, 29, .2)'],
        ['rgba(255, 180, 0, 1)', 'rgba(255, 180, 0, .2)'],
        ['rgba(0, 166, 237, 1)', 'rgba(0, 166, 237, .2)'],
        ['rgba(127, 184, 0, 1)', 'rgba(127, 184, 0, .2)'],
        ['rgba(13, 44, 84, 1)', 'rgba(13, 44, 84, .2)'],
     ]

      chart.data.datasets.forEach((ds, i) => {
        ds.pointRadius = 0;
        ds.borderColor = pallette[i % pallette.length][0];
        ds.backgroundColor = pallette[i % pallette.length][1];
        ds.borderWidth = 1;
        ds.hitRadius = 5;
      });
    }

    chart.data.labels = _.range(
      0,
      _.max(chart.data.datasets.map(d => d.data.length))
    );


    chart.update();
  }

  return () => {
    return {el, update};
  }
}


const defaultQuery = () => ([
  [".", ["bucket", 5000, "milliseconds"]],
  [".", ["where", ["==", ["row.type", "success"]]]],
  [".", ["maximum", ["-", ["row.end_t", "row.start_t"]], "max_latency"]],
  [".", ["minimum", ["-", ["row.end_t", "row.start_t"]], "min_latency"]],
  [".", ["percentile", ["-", ["row.end_t", "row.start_t"]], 95, "p95_latency"]],
  [".", ["percentile", ["-", ["row.end_t", "row.start_t"]], 75, "p75_latency"]],
  [".", ["percentile", ["-", ["row.end_t", "row.start_t"]], 50, "p50_latency"]],
  [".", ["aggregates"]]
])

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
    [".", ["bucket", 1000, "milliseconds"]],
    ...query.slice(1)
  ]
}

function eventsToMeasures(events) {
  var measures = {};
  events.forEach((e) => {
    _.each(e.aggregations, (value, key) => {
      var points = measures[key] || [];
      const x = e.end_t / (1000 * 1000);
      points.push({x, y: value})
      measures[key] = points;
    });
  });
  return measures;
}

function model(api, channelFactory) {
  var yam;
  var onYamChartChanges;
  var onYamSummaryChanges;
  var onYamStatusChanges;
  var chart;

  return {
    state: {
      query: defaultQuery(),
      run: false,
      isLoading: false,
      latencyChart: false,
      charts: [],
      datasets: {},
      summary: {events: []},
      status: {events: []}
    },
    namespace: 'run',
    reducers: {
      show,
      error,
      appendChart,
      resetChart,
      summary,
      status,
      addExpr,
      delExpr,
      updateExpr,
      appendData
    },
    effects: {
      getRun: _.partial(getRun, api),
      initYam: (run, state, send, done) => {
        yam = channelFactory.create('yams', {
          run_id: run.id
        });
        yam.on('connected', () => {
          send('run:resetChart', done);
          send('run:appendChart', latencyChart(state, send), done);

          const {
            startSeconds,
            endSeconds,
          } = domainOf(state.run);

          const chartQ = {
            startSeconds,
            endSeconds,
            query: state.query
          };

          yam.query(chartQ, onYamChartChanges)

          if (isInProgress(state.run)) {
            send('run:chartChanges', chartQ, done);

            send('run:summaryChanges', {
              startSeconds,
              endSeconds,
              query: rolling(summaryQuery(state.run, state.query))
            }, done);

            send('run:statusChanges', {
              startSeconds,
              endSeconds,
              query: rolling(statusQuery(state.run))
            }, done);
          } else {
            yam.query({
              startSeconds,
              endSeconds,
              query: summaryQuery(state.run, state.query)
            }, onYamSummaryChanges);

            yam.query({
              startSeconds,
              endSeconds,
              query: statusQuery(state.run)
            }, onYamStatusChanges);
          }
        });
      },
      chartChanges: (query, state) => {
        yam.changes(query, onYamChartChanges);
      },
      summaryChanges: (query, state, send, done) => {
        yam.changes(query, onYamSummaryChanges);
      },
      statusChanges: (query, state, send, done) => {
        yam.changes(query, onYamStatusChanges);
      }
    },
    subscriptions: [
      (send, done) => {
        onYamChartChanges = (c) => send('run:appendData', c, done);
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

function appendData({events}, state, send, done) {
  const measures = eventsToMeasures(events);

  const datasets = _.map(measures, (data, label) => {
    const dataset = _.find(state.datasets, ds => ds.label === label) || {
      label,
      data: []
    };
    data.forEach(point => dataset.data.push(point));

    return dataset;
  });
  state.charts.forEach((chart) => chart().update(datasets));

  return {...state, datasets}
}

function summary(summary, state) {
  return {...state, summary};
}

function status(status, state) {
  return {...state, status};
}

function resetChart(_, state) {
  return {...state, charts: []};
}

function appendChart(el, state) {
  return {...state, charts: [...state.charts, el]};
}

function addExpr({which, expr}, state) {
}

function delExpr({which, expr}, state) {
  const q = _.without(state.query, expr)
  return {...state, query: q};
}

function updateExpr({which, expr}, state) {
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

function statiiView({run, status: {events}}) {
  if(!events.length) return html`<div class="statii"></div>`;
  const agg = events[0].aggregations;

  var label,
    unit;
  if(isInProgress(run)) {
    label = 'Response rates';
    unit = '/s'
  } else {
    label = 'Responses';
    unit = '';
  }

  return html`
  <div class="statii">
    <label class="toplevel text-muted">${label}</label>
    ${
      _.map(agg, (value, key) => {
        const name = key.split('_').join(' ');
        return html`
          <span class="stat">
            ${name} ${value}${unit}
          </span>
        `
      })
    }
  </div>
  `
}

function summaryView({summary: {events}}) {
  if(!events.length) return html`<div class="summary"></div>`;

  const agg = events[0].aggregations;
  return html`
    <div class="summary">
      <label class="toplevel text-muted">Summary</label>
      ${
        _.map(agg, (value, key) => {
          const name = key.split('_').join(' ');
          const formatted = millisFormat(value);

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
        ${utcFormat(run.finished_at)}
      </span>
    </span>`
  }

  return html`
    <div class="suite-progress">
      <label class="toplevel text-muted">Started</label>
      <span class="stat">${utcFormat(run.inserted_at)}</span>
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

  const onExprAdded   = (expr, which) => send('run:addExpr', {which, expr})
  const onExprDeleted = (expr, which) => send('run:delExpr', {which, expr})
  const onExprUpdated = (expr, which) => send('run:updateExpr', {which, expr})

  return html `
    <div>
      ${progressView(state)}
      ${statiiView(state)}
      ${summaryView(state)}
      <div class="charts">
        ${state.charts.map(t => t(state, send).el)}
      </div>
      ${queryBuilderView(
        state.query,
        onExprAdded,
        onExprDeleted,
        onExprUpdated
      )}

    </div>
  `




}

//TODO: make this match the route nav
function shouldLoad(appState) {
  return !appState.run.run && !appState.run.isLoading && !appState.run.error;
}

function view(appState, prev, send) {
  const {
    params, run: state
  } = appState;

  const get = () => {
    send('run:getRun', params);
  }

  return html `
    <div class="app">
      ${menu(appState, send)}
      ${flash(appState, send)}

      <div class="content" onload=${get}>
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