var chart; // global chart variable

var fields = [ 'Fermenter', 'Chamber', 'Room' ];

var series = [ {
    name : 'Sensor#1 Fermenter. (\u00B10.5\u00B0C)',
    data : []
}, {
    name : 'Sensor#2 Chamber (\u00B10.5\u00B0C)',
    data : []
}, {
    name : 'Sensor#3 Room (\u00B10.5\u00B0C)',
    data : []
} ];

// Get data from Pi NodeJS server
function getData() {
    $
            .getJSON(
                    './temperature_now.json',
                    function(data) {
                        // alert(data.unix_time);
                        // Create the series
                        var series = chart.series[0], shift = series.data.length > 20; // shift
                                                                                        // if
                                                                                        // the
                                                                                        // series
                                                                                        // longer
                                                                                        // than
                                                                                        // 20
                        // Add the point

                        var date = new Date();
                        // Get timezone offset and convert to milliseconds
                        var tz = date.getTimezoneOffset() * 60000; // one zero
                                                                    // more
                                                                    // because
                                                                    // (sec in
                                                                    // min * ms
                                                                    // in sec
                                                                    // ==> (60 *
                                                                    // 1000))

                        for ( var i = 0, l = fields.length; i < l; i++) {
                            chart.series[i].addPoint([ (data.temperature_record[0].unix_time) - tz,
                                    data.temperature_record[0][fields[i]]], true, shift);
                        }
                        // Repeat this function call after 1 second
                        setTimeout(getData, 1000);
                    });
}

// Configure the plot
$(document).ready(function() {
    chart = new Highcharts.Chart({
        chart : {
            renderTo : 'container',
            defaultSeriesType : 'spline',
            events : {
                load : getData
            }
        },
        title : {
            text : '[BrewLab Tokyo] Live Temperature Plot'
        },
        xAxis : {
            type : 'datetime',
            tickPixelInterval : 150,
            maxZoom : 20 * 1000,
            title : {
                text : 'Time (sensor called at one second intervals)',
                margin : 15
            }
        },
        yAxis : {
            minPadding : 0.2,
            maxPadding : 0.2,
            title : {
                text : 'Temperature \u00B0C',
                margin : 15
            }
        },
        series : series
    });
});
