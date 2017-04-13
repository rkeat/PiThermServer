var chart; // global chart variable
//Get data from server in JSON format (query time series when sensor was outside).

var fields = [ 'Fermenter', 'Chamber', 'Room' ];

var series = [ {
    id : 'series1',
    name : 'Sensor#1 Fermenter (\u00B10.5\u00B0C)',
    type : 'spline',
    data : []
}, {
    id : 'series2',
    name : 'Sensor#2 Chamber (\u00B10.5\u00B0C)',
    type : 'spline',
    data : []
}, {
    id : 'series3',
    name : 'Sensor#3 Room (\u00B10.5\u00B0C)',
    type : 'spline',
    data : []
} ];

function getData() {
    $.getJSON('/temperature_query.json?num_obs=-1&start_date=2013-01-23T16:00',
            function(data) {
                var i = 0;
                var date = new Date();
                // Get timezone offset and convert to milliseconds
                var tz = date.getTimezoneOffset() * 60000; // one zero
                // more because (sec in min * ms in sec ==> (60 * 1000))

                // Iterate JSON data series and add to plot
                while (data.temperature_record[0][i]) {
                    for ( var j = 0, l = fields.length; j < l; j++) {
                        series[j].data.push([
                                (data.temperature_record[0][i].unix_time) - tz,
                                data.temperature_record[0][i][fields[j]] ]);
                    }
                    i++;
                }
                for ( var i = 0, l = series.length; i < l; i++) {
                    chart.addSeries(series[i]);
                }
            });
}

//Configure the plot
$(document).ready(function() {
    chart = new Highcharts.Chart({
        chart : {
            renderTo : 'container',
             //type: 'spline',
            zoomType : 'x',
            spaceRight : 20,
            events : {
                load : getData()
            }
        },
        title : {
            text : '[BrewLive] Fermentation Log '
        },
        subtitle : {
            text : 'Click and drag in the plot area to zoom in',
            align : 'right',
        },

        xAxis : {
            type : 'datetime',
            tickPixelInterval : 150,
            maxZoom : 20 * 1000,
            title : {
                text : 'Time',
                margin : 15
            }
        },
        yAxis : {
            minPadding : 0.2,
            maxPadding : 0.2,
            showFirstLabel : false,
            title : {
                text : 'Temperature \u00B0C',
                margin : 15
            }
        },
        plotOptions : {},
    });
});
