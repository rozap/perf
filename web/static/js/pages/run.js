import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import errorView from './widgets/error';
import menu from './widgets/menu';
import flash from './widgets/flash';
import loader from './widgets/loader';
import {fromAst, toAst} from './widgets/yams/funcs';
import queryBuilderView from './widgets/query-builder';
import {chart} from './widgets/chart';
import moment from 'moment';
import {utcFormat, domainOf, timeFormat, millisFormat} from '../time';




const defaultQueries = () => {
  const latency = fromAst([
    ["bucket", 5000, "milliseconds"],
    ["where", ["==", "row.type", "success"]],
    ["maximum", ["-", "row.end_t", "row.start_t"], "max_latency"],
    ["minimum", ["-", "row.end_t", "row.start_t"], "min_latency"],
    ["percentile", ["-", "row.end_t", "row.start_t"], 95, "p95_latency"],
    ["percentile", ["-", "row.end_t", "row.start_t"], 75, "p75_latency"],
    ["percentile", ["-", "row.end_t", "row.start_t"], 50, "p50_latency"]
  ]);

  return {latency};
}

const defaultQueryBuilders = (queries) => {
  return _.mapObject(queries, (_, tag) => {
    return queryBuilderView(tag);
  });
}

function summaryQuery(run, query) {
  const {duration} = domainOf(run);
  return fromAst([
    ["bucket", duration, "milliseconds"],
    ["where", ["==", "row.type", "success"]],
    ["maximum", ["-", "row.end_t", "row.start_t"], "max_latency"],
    ["minimum", ["-", "row.end_t", "row.start_t"], "min_latency"],
    ["percentile", ["-", "row.end_t", "row.start_t"], 95, "p95_latency"],
    ["percentile", ["-", "row.end_t", "row.start_t"], 75, "p75_latency"],
    ["percentile", ["-", "row.end_t", "row.start_t"], 50, "p50_latency"]
  ])
}

function statusQuery(run) {
  const {duration} = domainOf(run);
  return fromAst([
    ["bucket", duration, "seconds"],
    ["count_where", ["==", "row.type", "success"], "success_count"],
    ["count_where", ["==", "row.type", "error"], "error_count"],
    [
      "count_where", [
        "&&",
        [">=", "row.status", 200],
        ["<", "row.status", 300]

      ],
      "2xx_count"
    ],
    [
      "count_where", [
        "&&",
          [">=", "row.status", 400],
          ["<", "row.status", 500]
      ],
      "4xx_count"
    ],
    [
      "count_where", [
        "&&",
        [">=", "row.status", 500],
        ["<", "row.status", 600]
      ],
      "5xx_count"
    ]
  ]);
}

function rolling(query) {
  return [
    ["bucket", 4000, "milliseconds"],
    ...query.slice(1)
  ]
}


function model(api, channelFactory) {
  var yam;
  var onYamChartChanges;
  var onYamSummaryChanges;
  var onYamStatusChanges;

  return {
    state: {
      queries: defaultQueries(),
      queryBuilders: defaultQueryBuilders(defaultQueries()),
      charts: {},
      run: false,
      isLoading: false,
      latencyChart: false,
      datasets: {},
      summary: {events: []},
      status: {events: []},
    },
    namespace: 'run',
    reducers: {
      show,
      error,
      appendChart,
      summary,
      status,
      appendData,
      onChangeExpr,
      clearDataset,
    },
    effects: {
      getRun: _.partial(getRun, api),
      initYam: (run, state, send, done) => {
        yam = channelFactory.create('yams', {
          run_id: run.id
        });

        send('run:appendChart', {tag: 'latency', chart: chart(state, send)}, done);
        send('run:sendQuery', {tag: 'latency'}, done);


        const {
          startSeconds,
          endSeconds,
        } = domainOf(state.run);

        if (isInProgress(state.run)) {
          console.log("it's in progress..")
          // send('run:chartChanges', chartQ, done);
          // send('run:summaryChanges', {
          //   startSeconds,
          //   endSeconds,
          //   query: rolling(summaryQuery(state.run, toAst(state.query)))
          // }, done);

          // send('run:statusChanges', {
          //   startSeconds,
          //   endSeconds,
          //   query: rolling(statusQuery(state.run))
          // }, done);
        } else {
          console.log("Getting the thing....")
          yam.query('summary', {
            startSeconds,
            endSeconds,
            query: toAst(summaryQuery(state.run))
          }, onYamSummaryChanges);

          yam.query('status', {
            startSeconds,
            endSeconds,
            query: toAst(statusQuery(state.run))
          }, (c) => console.log("status??", c));
        }

        // send('run:initCharts', {}, done);
      },
      // initCharts: (_params, state, send, done) => {
      //   send('run:appendChart', chart(state, send), done);
      //   send('run:sendQuery', {tag: 'latency'}, done);
        // send('run:appendChart', throughputChart(state, send), done);



        // if (isInProgress(state.run)) {
        //   send('run:chartChanges', chartQ, done);
        //   send('run:summaryChanges', {
        //     startSeconds,
        //     endSeconds,
        //     query: rolling(summaryQuery(state.run, toAst(state.query)))
        //   }, done);

        //   send('run:statusChanges', {
        //     startSeconds,
        //     endSeconds,
        //     query: rolling(statusQuery(state.run))
        //   }, done);
        // } else {
        //   yam.query('summary', {
        //     startSeconds,
        //     endSeconds,
        //     query: summaryQuery(state.run, toAst(state.query))
        //   }, onYamSummaryChanges);

        //   yam.query('status', {
        //     startSeconds,
        //     endSeconds,
        //     query: statusQuery(state.run)
        //   }, onYamStatusChanges);
        // }
      // },
      sendQuery: ({tag}, state, send, done) => {
        send('run:clearDataset', {tag}, done);

        const chart = state.charts[tag]().chart;
        chart.data.datasets = [];
        chart.render();

        const {
          startSeconds,
          endSeconds,
        } = domainOf(state.run);

        const chartQ = {
          startSeconds,
          endSeconds,
          query: toAst(state.queries[tag])
        };

        yam.query(`chart.${tag}`, chartQ, onYamChartChanges(tag));
      },

      // chartChanges: (query, state) => {
      //   yam.changes('chart-changes', query, onYamChartChanges);
      // },
      // summaryChanges: (query, state, send, done) => {
      //   yam.changes('summary-changes', query, onYamSummaryChanges);
      // },
      // statusChanges: (query, state, send, done) => {
      //   yam.changes('status-changes', query, onYamStatusChanges);
      // }
    },
    subscriptions: [
      (send, done) => {
        onYamChartChanges = (tag) => (events) => send('run:appendData', {tag, events: events.events}, done);
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

function appendData({tag, events}, state, send, done) {
  const measures = eventsToMeasures(events);
  console.log("Append data", tag, measures);

  const tagDatasets = _.map(measures, (data, label) => {
    const dataset = _.find(state.datasets[tag] || [], ds => ds.label === label) || {
      label,
      data: []
    };
    data.forEach(point => dataset.data.push(point));

    return dataset;
  });

  state.charts[tag]().update(tagDatasets);

  // i know this is mutatey but it's slow otherwise 
  var datasets = state.datasets;
  datasets[tag] = tagDatasets;
  return {...state, datasets: datasets};
}


function clearDataset({tag}, state) {
  return {...state, datasets: _.omit(state.datasets, tag)};
}

function onChangeExpr({tag, query}, state) {
  var o = {};
  o[tag] = query;
  const queries = _.extend({}, state.queries, o);
  return {...state, queries: queries}
}
function summary(summary, state) {
  return {...state, summary};
}

function status(status, state) {
  return {...state, status};
}

function appendChart({tag, chart}, state) {
  var o = {};
  o[tag] = chart;
  const charts = _.extend({}, state.charts, o);
  return {...state, charts: charts};
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


  const chartAndQuery = (tag, f) => {
    const oldQuery = toAst(state.queries[tag]);
    const onChangeExpr = (query, isValid) => {
      send('run:onChangeExpr', {tag, query});
      const newQuery = toAst(query);
      console.log("expr changed, valid: ", isValid)
      if(isValid && !_.isEqual(oldQuery, newQuery)) {
        console.log(oldQuery, '===>', newQuery);
        send('run:sendQuery', {tag});
      }
    }
    return html`
    <div class="aspect">
      <div class="chart">
        ${f(state, send).el}
      </div>
      <div class="query-builder">
        ${state.queryBuilders[tag](
          state.queries[tag],
          onChangeExpr
        )}
      </div>
    </div>
    `
  }

  return html `
    <div>
      ${progressView(state)}
      ${statiiView(state)}
      ${summaryView(state)}
      <div class="charts">
        ${_.map(state.charts, (f, tag) => chartAndQuery(tag, f))}
      </div>
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