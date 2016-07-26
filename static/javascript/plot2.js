requirejs.config({
  baseUrl: '/static/',
  paths: {
    d3: 'lib/javascript/d3',
    queue: 'lib/javascript/d3-queue',
    crossfilter: 'lib/javascript/crossfilter',
    dc: 'lib/javascript/dc.min',
    jquery: 'lib/javascript/jquery-2.2.4.min',
    underscore: 'lib/javascript/underscore-min',
  },
  shim: {
    'crossfilter': {
      deps: [],
      exports: 'crossfilter'
    }
  }
});
//

requirejs(['d3', 'queue', 'jquery', 'underscore'],
function(d3, queue, $, _) {

  var margin = {top: 10, right: 120, bottom: 100, left: 40},
    margin2 = {top: 430, right: 120, bottom: 20, left: 40},
    width = 900 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    height2 = 500 - margin2.top - margin2.bottom;
  //var parseDate = d3.time.format("%Y-%m-%dT%H:%M:%S.%LZ").parse;
  var parseDate = d3.time.format("%Y-%m-%d %H:%M:%S").parse;

  var x = d3.time.scale().range([0, width]),
  x2 = d3.time.scale().range([0, width]),
  y = d3.scale.linear().range([height, 0]),
  y2 = d3.scale.linear().range([height2, 0]);

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .innerTickSize(-height);

  var xAxis2 = d3.svg.axis()
    .scale(x2)
    .orient("bottom")
    .innerTickSize(-height2);
  //yAxis = d3.svg.axis().scale(y).orient("left");

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

  var color = d3.scale.category10();

  var brush = d3.svg.brush()
    .x(x2)
    .on("brushend", brushend)
    .on("brush", brushed);

  var brushFocus = d3.svg.brush()
    .x(x)
    .on("brush", brushed)
    .on("brushend", brushendFocus );

  var line = d3.svg.line()
    .interpolate("linear")
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.measure); });

  var line2 = d3.svg.line()
    .interpolate("linear")
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y2(d.measure); });

  // Marked area
  var markedArea = d3.svg.area()
    .interpolate("basis")
    .x(function(d) { return x(d.x); })
    .y(function(d) { return y(d.y); });

  var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  svg.append("defs").append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", width)
    .attr("height", height);

  var focus = svg.append("g")
    .attr("class", "focus")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var context = svg.append("g")
    .attr("class", "context")
    .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

  // Default zoom is 100
  queue.queue()
    // for the context
    .defer(d3.json, "/daten/"+currentSensor+"_20?nocache=" + (new Date()).getTime())
    // for the focus
    .defer(d3.json, "/daten/"+currentSensor+"_1?nocache=" + (new Date()).getTime())
    .await(makeGraphs);

  function makeGraphs(error, dataContext, data) {
    // Make every date in the csv data a javascript date object format
    //
    // ---------------------------------------
    // For the focus axis
    data.forEach(function(d) {
      d.date = parseDate(d.timestamp);
    });

    // Last date of update is printed to the page
    var lastUpdate = data[data.length-1].date;
    $('.aktualisierung').html(lastUpdate);

    color.domain(d3.keys(data[0]).filter(function(key) { return key !== "date"; }));

    var samples = color.domain().map(function(name) {
      return {
        name: name,
        values: data.map(function(d) {
          return {date: d.date, measure: +d[name]};
        }),
        visible: true
      }
    });
    // ---------------------------------------

    // ---------------------------------------
    // For the context axis
    dataContext.forEach(function(d) {
      d.date = parseDate(d.timestamp);
    });

    //color.domain(d3.keys(data[0]).filter(function(key) { return (key !== "date" ); }));

    var samplesContext = color.domain().map(function(name) {
      return {
        name: name,
        values: dataContext.map(function(d) {
          return {date: d.date, measure: +d[name]};
        }),
        visible: true
      };
    });

    // ---------------------------------------

    x.domain(d3.extent(data.map(function(d) { return d.date; })));
    y.domain([0, d3.max(data.map(function(d) { return d.t_surf_mitte_oben; }))]);
    //y.domain([10,0]);
    x2.domain(x.domain());
    y2.domain(y.domain());

    //
    y.domain([
        d3.min(samples, function(c) { return d3.min(c.values, function(v) { return v.measure; }); }),
        d3.max(samples, function(c) { return d3.max(c.values, function(v) { return v.measure; }); })
    ]);

    y2.domain([
        d3.min(samplesContext, function(c) { return d3.min(c.values, function(v) { return v.measure; }); }),
        d3.max(samplesContext, function(c) { return d3.max(c.values, function(v) { return v.measure; }); })
    ]);

    var sample = focus.selectAll(".sample")
      .data(samples)
      .enter().append("g")
      .attr("class", "sample");

    sample.append("path")
      .attr("class", "line")
      .attr("clip-path", "url(#clip)")
      .attr("d", function(d) { return line(d.values); })
      .style("stroke", function(d) { return color(d.name); });

    var sampleContext = context.selectAll(".sample")
      .data(samplesContext)
      .enter().append("g")
      .attr("class", "sample");

    sampleContext.append("path")
      .attr("class", "line")
      .attr("d", function(d) { return line2(d.values); })
      .style("stroke", function(d) { return color(d.name); });

    // make legends
    var legendSpace = 20;
    sample.append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("x", width + (margin.right/3) - 10)
      // spacing
      .attr("y", function (d, i) { return 20+i*legendSpace; })
      .attr("fill", function(d) {
        // If array key "visible" = true then color rect, if not then make it grey
        return d.visible ? color(d.name) : "#F1F1F2";         }
        )
      .attr("class", "legend-box")
      // On click make d.visible
      .on("click", function(d){
        // If array key for this data selection is "visible" = true then make it false, if false then make it true
        d.visible = !d.visible;
        // TODO: do also for the lines in the context
        //

        /*
        // Find max Y rating value categories data with "visible"; true
        newRange = findMaxY(samples);
        // Redefine yAxis domain based on highest y value of categories data with "visible"; true
        y.domain(newRange);
        svg.select(".y.axis")
          .transition()
          .call(yAxis);
        */
        sample.select("path")
          .transition()
          .attr("d", function(d){
            // If d.visible is true then draw line for this d selection
            return d.visible ? line(d.values) : null;
          })
        sample.select("rect")
          .transition()
          .attr("fill", function(d) {
            return d.visible ? color(d.name) : "#F1F1F2";
          });
      }
    )
      .on("mouseover", function(d){
        d3.select(this)
          .transition()
          .attr("fill", function(d) { return color(d.name); });
        d3.select("#line-" + d.name.replace(" ", "").replace("/", ""))
          .transition()
          .style("stroke-width", 2.5);
      }
      )
      .on("mouseout", function(d){
        d3.select(this)
          .transition()
          .attr("fill", function(d) {
            return d.visible ? color(d.name) : "#F1F1F2";});
        d3.select("#line-" + d.name.replace(" ", "").replace("/", ""))
          .transition()
          .style("stroke-width", 1.5);
      })

    // Add the labels for each data series
    sample.append("text")
      .attr("class", "text")
      .attr("x", width + (margin.right/3)+10)
      .attr("y", function (d, i) { return 30+i*legendSpace; })
      .text(function(d) { return d.name; });

    // Add the data lines to the context view
    sampleContext.append("path")
      .attr("class", "line")
      .attr("d", function(d) { return line2(d.values); })
      .style("stroke", function(d) { return color(d.name); });

    // Append y-Axis to the focus view
    focus.append("g")
      .attr("class", "y axis")
      .call(yAxis);

    // Append x-Axis element to the focus view
    context.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height2 + ")")
      .call(xAxis2);

    // Append brush element to the context view
    context.append("g")
      .attr("class", "x brush")
      .call(brush)
      .selectAll("rect")
      .attr("y", -6)
      .attr("height", height2 + 7);

    sample.append("g")
      .call(brushFocus)
      .attr("class", "x brushFocus")
      .selectAll("rect")
      .attr("y", -6)
      .attr("height", height + 7);

    focus.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    //
    // Crosshair
    /*
       var capture = sample.append('g').style('display', null);
       var crosshair = sample.append('g').style('display', null);

       crosshair.append('line')
       .attr('id', 'focusLineX')
       .attr('class', 'focusLine');

       var bisectDate = d3.bisector(function(d) { return d[0]; }).left;

       capture.append('rect')
       .attr('class', 'overlay')
       .attr('width', width)
       .attr('height', height)
       .on('mouseover', function() {
    //crosshair.style('display', null);
    })
    .on('mouseout', function() {
    crosshair.select('#focusLineX')
    .attr('x1', null).attr('y1', null)
    .attr('x2', null).attr('y2', null);
    //crosshair.style('display', null);
    })
    .on('mousemove', function(d) {
    var mouse = d3.mouse(this);
    var mouseDate = x.invert(mouse[0]);
    var mouseY = y.invert(mouse[1]);

    crosshair.select('#focusLineX')
    .attr('x1', x(mouseDate)).attr('y1', y(y.domain()[0]))
    .attr('x2', x(mouseDate)).attr('y2', y(y.domain()[1]));
    });
    */

  };

  function brushend() {
    x.domain(brush.empty() ? x2.domain() : brush.extent());

    focus.selectAll(".sample")
      .selectAll("path")
      .attr("x", function (d) {
        return x(d.date)})
      .attr("d", function(d){
        // If d.visible is true then draw line for this d selection
        return d.visible ? line(d.values) : null;
      });

    focus.select(".x.axis")
      .call(xAxis);
  }

  function brushendFocus() {

    //
    console.log(brushFocus.extent());
    brush.extent(brushFocus.extent());
    brush(d3.select(".brush").transition().duration(1000).delay(100));

    x.domain(brushFocus.empty() ? x.domain() : brushFocus.extent());

    focus.selectAll(".sample")
      .selectAll("path")
      .attr("x", function (d) {
        return x(d.date)})
      .attr("d", function(d){
        // If d.visible is true then draw line for this d selection
        return d.visible ? line(d.values) : null;
      });

    //
    brushFocus.extent([null, null]);
    //brushFocus(d3.select(".brushFocus").transition());
    svg.selectAll('.brushFocus').call(brushFocus);
    //
    focus.select(".x.axis")
      .call(xAxis);
  }

  function brushed() {
    //range = brush.extent();
    //let secondBrush = focus.select(".secondBrush");
  }

  function adjustYAxis(data){
    console.log(data);
  }

  function findMaxY(data){  // Define function "findMaxY"
    let domain = x.domain();
    // all dates
    let datesAll = $.map(data[0].values, function(e) {return e.date});
    // dates on the x domain
    let datesDomain = $.map(data[0].values, function(e) {
      if (e.date >= domain[0] && e.date <= domain[1]) {
        return e.date }
    });
    let indDomStart = _.indexOf(datesAll, datesDomain[0]);
    let indDomEnd = _.indexOf(datesAll, datesDomain[datesDomain.length - 1]);
    //

    var maxYValues = data.map(function(d) {
      if (d.visible){
        return d3.max(d.values.slice(indDomStart, indDomEnd), function(value) { // Return max value
          return value.measure;})
      }
    });
    var minYValues = data.map(function(d) {
      if (d.visible){
        return d3.min(d.values.slice(indDomStart, indDomEnd), function(value) { // Return min value
          return value.measure; })
      }
    });
    return [d3.min(minYValues), d3.max(maxYValues)];
  }

});
