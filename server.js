// server.js - NodeJS server for the PiThermServer project.

/*

 Parses data from DS18B20 temperature sensor and serves as a JSON object.
 Uses node-static module to serve a plot of current temperature (uses highcharts).

 Tom Holderness 03/01/2013
 Ref: www.cl.cam.ac.uk/freshers/raspberrypi/tutorials/temperature/
 */

// Load node modules
var http = require('http');
var sqlite3 = require('sqlite3');
var csv_stringify = require('csv-stringify');
var moment = require('moment');
var sensors = require('./sensors');
var logger = require('./logger');

// Use node-static module to server chart for client-side dynamic graph
var nodestatic = require('node-static');

// Setup static server for current directory
var staticServer = new nodestatic.Server(".");

// Setup database connection for logging
var db = new sqlite3.Database('./piTemps3.db');

var files = [ '/sys/bus/w1/devices/28-0516736063ff/w1_slave',
        '/sys/bus/w1/devices/28-05167357f6ff/w1_slave',
        '/sys/bus/w1/devices/28-031674c7f4ff/w1_slave' ];
var fields = [ 'Fermenter', 'Chamber', 'Room' ];

var msecs = 2000;// (60 * 2) * 1000; // log interval duration in milliseconds INTERVAL For Logger 10 sec.

// Create a new instance of a temperature sensor
var thermo = new sensors.temperature(files, fields);
var db_logger = new logger.logger(fields, db);

function json_handler(response) {
    return function(data) {
        response.writeHead(200, {
            "Content-type" : "application/json"
        });
        response.end(JSON.stringify(data), "ascii");
    };
}

function csv_handler(response) {
    return function(data) {
        var date = moment(Date.now()).format('YYYY-MM-DD_HH-mm');
        response.setHeader('Content-Type', 'text/plain');
        response.setHeader('Content-Disposition', 'attachment; filename=log_'
                + date + '.csv');
        csv_stringify(data.temperature_record[0], function(err, output) {
            response.write(output, 'binary');
            response.end();
        });
    };
}

// Setup node http server
var server = http.createServer(
// Our main server function
function(request, response) {
    // Grab the URL requested by the client and parse any query options
    var url = require('url').parse(request.url, true);
    var pathfile = url.pathname;
    var query = url.query;

    // Test to see if it's a database query
    if (pathfile == '/temperature_query.json') {
        // Test to see if number of observations was specified as url query
        var num_obs = -1; // If not specified default to 20. Note use -1 in
        // query string to get all.
        var start_date = '1970-01-01T00:00';
        if (query.num_obs) {
            num_obs = parseInt(query.num_obs);
        } else {

        }
        if (query.start_date) {
            start_date = query.start_date;
        } else {

        }
        // Send a message to console log
        console.log('Database query request from '
                + request.connection.remoteAddress + ' for ' + num_obs
                + ' records from ' + start_date + '.');
        // call selectTemp function to get data from database
        db_logger.query(num_obs, start_date, json_handler(response));
        return;
    }

    // Test to see if it's a request for current temperature
    if (pathfile == '/temperature_now.json') {
        thermo.read(json_handler(response));
        return;
    }

    if (pathfile == '/get_log') {
        db_logger.query(-1, '1970-01-01T00:00', csv_handler(response));
        return;
    }

    if (pathfile == '/') {
        pathfile = '/index.html';
    }

    // Handler for favicon.ico requests
    if (pathfile == '/favicon.ico') {
        response.writeHead(200, {
            'Content-Type' : 'image/x-icon'
        });
        response.end();

        // Optionally log favicon requests.
        // console.log('favicon requested');
        return;
    }

    else {
        // Print requested file to terminal
        console.log('Request from ' + request.connection.remoteAddress
                + ' for: ' + pathfile);
        request.url = pathfile;
        // Serve file using node-static
        staticServer.serve(request, response, function(err, result) {
            if (err) {
                // Log the error
                console.error("Error serving " + request.url + " - "
                        + err.message);

                // Respond to the client
                response.writeHead(err.status, err.headers);
                response.end('Error 404 - file not found');
                return;
            }
            return;
        });
    }
});

thermo.log(db_logger, msecs);

// Enable server
server.listen(7000);
// Log message
console.log('Server running at http://localhost:7000');
