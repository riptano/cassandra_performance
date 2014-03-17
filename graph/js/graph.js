var drawGraph = function() {

    $("svg").remove();

    //Dataset and metric to draw is passed via query option:
    var query = parseUri(location).queryKey;
    var stats_db = 'data/' + query.stats;
    var metric = query.metric;
    var operation = query.operation;
    var smoothing = query.smoothing;

    var xmin = query.xmin;
    var xmax = query.xmax;
    var ymin = query.ymin;
    var ymax = query.ymax;

    //Stress-ng (2.1) metrics:
    var stress_metrics = [
        'total_ops',
        'op_rate',
        'adj_op_rate',
        'key_rate',
        'mean',
        'med',
        '95th_latency',
        '99th_latency',
        '99.9th_latency',
        'max_latency',
        'elapsed_time',
        'stderr'
    ];
    var stress_metric_names = {
        'total_ops': 'Total operations',
        'op_rate': 'Operations / Second',
        'adj_op_rate': 'Adjusted Operations / Second',
        'key_rate': 'Key rate',
        'mean': 'Latency mean',
        'med': 'Latency median',
        '95th_latency': 'Latency 95th percentile',
        '99th_latency': 'Latency 99th percentile',
        '99.9th_latency': 'Latency 99.9th percentile',
        'max_latency': 'Maximum latency',
        'elapsed_time': 'Total operation time (seconds)',
        'stderr': 'stderr'
    };

    var metric_index = stress_metrics.indexOf(metric);
    var time_index = stress_metrics.indexOf('elapsed_time');
    
    //Keep track of what operations are availble from the test:
    operations = {};

    //Check query parameters:
    var url = location.href;
    if (metric == undefined) {
        url=url+'&metric=op_rate';
    }
    if (operation == undefined) {
        url=url+'&operation=write';
    }
    if (smoothing == undefined) {
        url=url+'&smoothing=1';
    }
    if (url != location.href) {
        location.href = url;
    }

    /// Add dropdown controls to select chart criteria / options:
    var chart_controls = $('<div id="chart_controls"/>');
    var chart_controls_tbl = $('<table/>');
    chart_controls.append(chart_controls_tbl);
    $('body').append(chart_controls);
    var metric_selector = $('<select id="metric_selector"/>');
    $.each(stress_metric_names, function(k,v) {
        if (k == 'elapsed_time') {
            return; //Elapsed time makes no sense to graph, skip it.
        }
        var option = $('<option/>').attr('value', k).text(v);
        if (metric == k) {
            option.attr('selected','selected');
        }
        metric_selector.append(option);

    });
    metric_selector.change(function(e) {
        // change the metric in the url to reload the page:
        location.href = location.href.replace(new RegExp('metric=[a-zA-Z_0-9]*'), 'metric='+this.value);
    });
    chart_controls_tbl.append('<tr><td><label for="metric_selector"/>Choose metric:</label></td><td id="metric_selector_td"></td></tr>')
    $('#metric_selector_td').append(metric_selector);

    var operation_selector = $('<select id="operation_selector"/>')
    operation_selector.change(function(e) {
        // change the metric in the url to reload the page:
        location.href = location.href.replace(new RegExp('operation=[a-zA-Z_\-]*'), 'operation='+this.value);        
    });
    chart_controls_tbl.append('<tr><td><label for="operation_selector"/>Choose operation:</label></td><td id="operation_selector_td"></td></tr>')
    $('#operation_selector_td').append(operation_selector);


    var smoothing_selector = $('<select id="smoothing_selector"/>')
    $.each([1,2,3,4,5,6,7,8], function(i, v) {
        var option = $('<option/>').attr('value', v).text(v);
        if (smoothing == v) {
            option.attr('selected','selected');
        }
        smoothing_selector.append(option);
    });
    smoothing_selector.change(function(e) {
        // change the metric in the url to reload the page:
        location.href = location.href.replace(new RegExp('smoothing=[0-9]*'), 'smoothing='+this.value);
    });
    chart_controls_tbl.append('<tr><td><label for="smoothing_selector"/>Data smoothing:</label></td><td id="smoothing_selector_td"></td></tr>')
    $('#smoothing_selector_td').append(smoothing_selector).append(" To hide/show a dataset double-click the colored box below:");

    //Setup chart:
    var margin = {top: 20, right: 1180, bottom: 2240, left: 60};
    var width = 2060 - margin.left - margin.right;
    var height = 2700 - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var color = d3.scale.category10();

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var getMetricValue = function(d) {
        if (metric_index >= 0) {
            //This is one of the metrics directly reported by stress:
            return d[metric_index];
        } else {
            //This metric is not reported by stress, so compute it ourselves:
            if (metric == 'num_timeouts') {
                return d[stress_metrics.indexOf('interval_op_rate')] - d[stress_metrics.indexOf('interval_key_rate')];
            }
        }        
    };

    var line = d3.svg.line()
        .interpolate("basis")
        .x(function(d) { 
            return x(d[time_index]); //time in seconds
        })
        .y(function(d) { 
            return y(getMetricValue(d));
        });

    var svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right + 250)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");    

    d3.json(stats_db, function(error, raw_data) {
        //Filter the dataset for the one we want:
        var data = [];
        var trials = {};
        var data_by_title = {};
        raw_data.stats.forEach(function(d) {
            operations[d.test] = true;
            if (d.test!=operation) {
                return;
            }
            d.title = d.hasOwnProperty('label') ? d['label'] : d['revision'];
            data_by_title[d.title] = d;
            data.push(d);
            trials[d.title] = d;
            //Clean up the intervals:
            //Remove every other item, so as to smooth the line:
            new_intervals = [];
            d.intervals.forEach(function(i, x) {
                //Skip data that is outside our x range:
                if (i[time_index] < xmin || i[time_index] >= xmax)
                    return;
                
                if (x % smoothing == 0) {
                    new_intervals.push(i);
                }
            });
            d.intervals = new_intervals;
        });

        //Fill operations available from test:
        $.each(operations, function(k) {
            var option = $('<option/>').attr('value', k).text(k);
            if (operation == k) {
                option.attr('selected','selected');
            }
            operation_selector.append(option);
            //If the operation selected is not one of the available
            //operations in the JSON data file, select the first
            //operation available and refresh the page:
            if (!(operation in operations)) {
                $(operation_selector).val($(operation_selector).find("option :first").text()).change();
            }
        });


        //Parse the dates:
        data.forEach(function(d) {
            d.date = new Date(Date.parse(d.date));
        });

        color.domain(data.map(function(d){return d.title}));

        if (xmin == undefined) {
            xmin = 1;
        }
        if (xmax == undefined) {
            xmax = d3.max(data, function(d) {
                if (d.intervals.length > 0) {
                    return d.intervals[d.intervals.length-1][time_index];
                }
            });
        }

        if (ymin == undefined) {
            ymin = 0;
        }
        if (ymax == undefined) {
            ymax = d3.max(data, function(d) {
                return d3.max(d.intervals, function(i) {
                    return getMetricValue(i);
                });
            });
        }

        x.domain([xmin, xmax]);
        y.domain([ymin, ymax]);

        // Chart title
        svg.append("text")
            .attr("x", width / 2 )
            .attr("y", 0 )
            .style('font-size', '2em')
            .style("text-anchor", "middle")
            .text(raw_data.title + ' - ' + operation);

        // x-axis - time
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        // x-axis label   
        svg.append("text")
            .attr("x", width / 2 )
            .attr("y", height + 30 )
            .style("text-anchor", "middle")
            .style("font-size", "1.2em")
            .text(stress_metric_names['elapsed_time']);

        // y-axis
        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -60)
            .attr("dy", ".91em")
            .style("font-size", "1.2em")
            .style("text-anchor", "end")
            .text(stress_metric_names[metric]);

        var trial = svg.selectAll(".trial")
            .data(data)
            .enter().append("g")
            .attr("class", "trial")
            .attr("title", function(d) {
                return d.title;
            });

        // Draw benchmarked data:
        trial.append("path")
            .attr("class", "line")
            .attr("d", function(d) {
                return line(d.intervals);
            })
            .style("stroke", function(d) { return color(d.title); });

        var legend = svg.selectAll(".legend")
            .data(color.domain())
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", function(d, i) {
                var y_offset = 425 + ((i % 3)*170) + 70;
                var x_offset = -550 + (350 * (Math.ceil((i+1) / 3.0) - 1));
                return "translate(" + x_offset + "," + y_offset + ")"; 
            });

        var renderLegendText = function(linenum, getTextCallback) {
            legend.append("text")
                .attr("x", width - 24 - 250)
                .attr("y", 12*linenum)
                .attr("dy", ".35em")
                .style("font-family", "monospace")
                .style("font-size", "1.2em")
                .style("text-anchor", "start")
                .text(function(d) { 
                    return getTextCallback(d);
                });
        };

        var padTextEnd = function(text, length) {
            for(var x=text.length; x<length; x++) {
                text = text + '\u00A0';
            }
            return text;
        };
        var padTextStart = function(text, length) {
            for(var x=text.length; x<length; x++) {
                text = '\u00A0' + text;
            }
            return text;
        };

        renderLegendText(1, function(title) {
            return padTextStart(title, title.length + 5);
        });

        renderLegendText(2, function(title) {
            return '---------------------------------------';
        });

        renderLegendText(3, function(title) {
            return padTextEnd('real op rate', 26) + " : " + data_by_title[title]['real op rate'];
        });

        renderLegendText(4, function(title) {
            return padTextEnd('adjusted op rate', 26) + " : " + data_by_title[title]['adjusted op rate'];
        });

        renderLegendText(5, function(title) {
            return padTextEnd('adjusted op rate stderr', 26) + ' : ' + data_by_title[title]['adjusted op rate stderr'];
        });

        renderLegendText(6, function(title) {
            return padTextEnd('key rate', 26) + ' : ' + data_by_title[title]['key rate'];
        });

        renderLegendText(7, function(title) {
            return padTextEnd('latency mean', 26) + ' : ' + data_by_title[title]['latency mean'];
        });

        renderLegendText(8, function(title) {
            return padTextEnd('latency median', 26) + ' : ' + data_by_title[title]['latency median'];
        });

        renderLegendText(9, function(title) {
            return padTextEnd('latency 95th percentile', 26) + ' : ' + data_by_title[title]['latency 95th percentile'];
        });

        renderLegendText(10, function(title) {
            return padTextEnd('latency 99th percentile', 26) + ' : ' + data_by_title[title]['latency 99th percentile'];
        });

        renderLegendText(11, function(title) {
            return padTextEnd('latency 99.9th percentile', 26) + ' : ' + data_by_title[title]['latency 99.9th percentile'];
        });

        renderLegendText(12, function(title) {
            return padTextEnd('latency max', 26) + ' : ' + data_by_title[title]['latency max'];
        });

        renderLegendText(13, function(title) {
            var cmd = data_by_title[title]['command'].replace(new RegExp(' \-node [a-zA-Z_0-9]*'), '');
            return 'cmd: ' + cmd;
        });

        legend.append("rect")
            .attr("x", width - 270)
            .attr("width", 18)
            .attr("height", 18)
            .attr("class", "legend-rect")
            .attr("title", function(title) {
                return title;
            })
            .style("fill", color);

        //Make trials hideable by double clicking on the colored legend box
        $("rect.legend-rect").dblclick(function() {
            $("g.trial[title='" + $(this).attr('title') + "']").toggle();
        });

    });

}

$(document).ready(function(){
    
    drawGraph();
    
});
