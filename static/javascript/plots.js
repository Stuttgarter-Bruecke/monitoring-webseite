requirejs.config({
  baseUrl: '/static/',
  paths: {
    d3: 'lib/javascript/d3',
    queue: 'lib/javascript/d3-queue',
    crossfilter: 'lib/javascript/crossfilter',
    dc: 'lib/javascript/dc.min',
  },
  shim: {
    'crossfilter': {
      deps: [],
      exports: 'crossfilter'
    }
  }
});
//

requirejs(['d3', 'queue', 'crossfilter', 'dc'],
    function(d3, queue, crossfilter, dc) {
      queue.queue()
        .defer(d3.json, "/static/data/data_records.json?nocache=" + (new Date()).getTime())
        .await(makeGraphs);

      function makeGraphs(error, projectsJson) {

        var compositeChart = dc.compositeChart;
        dc.compositeChart = function(parent, chartGroup) {
          var _chart = compositeChart(parent, chartGroup);

          _chart._brushing = function () {
            var extent = _chart.extendBrush();
            var rangedFilter = null;
            if(!_chart.brushIsEmpty(extent)) {
              rangedFilter = dc.filters.RangedFilter(extent[0], extent[1]);
            }

            dc.events.trigger(function () {
              if (!rangedFilter) {
                _chart.filter(null);
              } else {
                _chart.replaceFilter(rangedFilter);
              }
              _chart.redrawGroup();
            }, dc.constants.EVENT_DELAY);
          };

          return _chart;
        };

        var dataFeucht = projectsJson;
        //var dateFormat = d3.time.format("%S");

        dataFeucht.forEach(function(d, i) {
          d.index = i;
        });

        var ndx = crossfilter(dataFeucht);
        var all = ndx.groupAll();

        var dimension = ndx.dimension(function(d) {
          return d.index; 
        });

        var dimensionB = ndx.dimension(function(d) {
          return d.index; 
        });

        var verschiebungGroupA = dimension.group().reduceSum(function (d) { return d.a; });

        var verschiebungGroupB = dimension.group().reduceSum(function (d) { return +d.b; });
        var verschiebungGroupC = dimension.group().reduceSum(function (d) { return +d.c; });
        var verschiebungGroupD = dimension.group().reduceSum(function (d) { return +d.b; });
        var verschiebungGroupE = dimension.group().reduceSum(function (d) { return +d.c; });

        // max value
        var max_state = verschiebungGroupA.top(1)[0].value;

        var minDate = dimension.bottom(1)[0].index;
        var maxDate = dimension.top(1)[0].index;

        var lineChart1 = dc.compositeChart("#time-chart");
        var lineChart2 = dc.compositeChart("#time-chart-zoom");

        var line1 = dc.lineChart("#line1")
          .group(verschiebungGroupB)
          .elasticY(true)
          .elasticX(true)
          .colors(['#00af00',]);

        var line2 = dc.lineChart("#line2")
          .group(verschiebungGroupC)
          .elasticY(true)
          .elasticX(true)
          .colors(['#00a0e0',]);

        var line3 = dc.lineChart("#line4")
          .group(verschiebungGroupD)
          .colors(['#00af00',]);

        var line4 = dc.lineChart("#line3")
          .group(verschiebungGroupE)
          .colors(['#00a0e0',]);

        lineChart1.width(800)
          .height(250)
          .margins({ top: 10, right: 10, bottom: 20, left: 40 })
          .dimension(dimension)
          .transitionDuration(500)
          .brushOn(false)
          .x(d3.scale.linear().domain([minDate, maxDate]))
          .compose([
              line1,
              line2
          ])
          .on("filtered", function (chart, filter) {
            dc.events.trigger(function () {
              lineChart1.x(d3.scale.linear().domain(filter));
              lineChart1.redraw();
            });
          })
          ;

        lineChart2.width(800)
          .height(100)
          .margins({ top: 10, right: 10, bottom: 20, left: 40 })
          .dimension(dimensionB)
          .transitionDuration(500)
          .elasticY(false)
          .brushOn(true)
          .x(d3.scale.linear().domain([minDate, maxDate]))
          .compose([
              line3,
              line4
          ])
          .on("postRedraw", function (chart) {
            let range = chart.filter();
            dc.events.trigger(function () {
              console.log(range);
              lineChart1.filter(chart.filter());
              lineChart1.x(d3.scale.linear().domain([range[0], range[1]]));
              line1.x(d3.scale.linear().domain([range[0], range[1]]));
              line1.redraw();
              line2.x(d3.scale.linear().domain([range[0], range[1]]));
              line2.redraw();
              lineChart1.redraw();
            });
          })
        ;


        dc.renderAll();
      };
    });

