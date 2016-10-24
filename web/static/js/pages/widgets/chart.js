import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import {fromAst, toAst} from './yams/funcs';
import moment from 'moment';
import {utcFormat, domainOf, timeFormat, millisFormat} from '../../time';
import cjs from 'chart.js';


function chart({run}, send) {
  const el = document.createElement('div');
  el.setAttribute('class', 'chart-container')
  var canvas = document.createElement('canvas');

  el.isSameNode = (other) => {
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
    return {el, update, chart};
  }
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


export
default {
  chart
}