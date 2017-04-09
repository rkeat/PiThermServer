// server.js - NodeJS server for the PiThermServer project.

/*

 Parses data from DS18B20 temperature sensor and serves as a JSON object.
 Uses node-static module to serve a plot of current temperature (uses highcharts).

 Tom Holderness 03/01/2013
 Ref: www.cl.cam.ac.uk/freshers/raspberrypi/tutorials/temperature/
 */

// Load node modules
var fs = require('fs');
var async = require('async');
var http = require('http');
var sqlite3 = require('sqlite3');
var csv_stringify = require('csv-stringify');
var moment = require('moment');

// Use node-static module to server chart for client-side dynamic graph
var nodestatic = require('node-static');

// Setup static server for current directory
var staticServer = new nodestatic.Server(".");

// Setup database connection for logging
var db = new sqlite3.Database('./piTemps3.db');

var files = [ '/sys/bus/w1/devices/28-031674c7f4ff/w1_slave',
        '/sys/bus/w1/devices/28-05167357f6ff/w1_slave',
        '/sys/bus/w1/devices/28-0516736063ff/w1_slave' ];
var files = [ 'temp1.txt', 'temp2.txt', 'temp3.txt' ];
var fields = [ 'Fermenter', 'Chamber', 'Room' ];

var msecs = 1000;// (60 * 2) * 1000; // log interval duration in milliseconds

// Write a single temperature record in JSON format to database table.
function insertTemp(data) {
    // data is a javascript object
    var sql_command = "INSERT INTO temperature_records VALUES (?, ";
    var command = 'statement.run(data.temperature_record[0].unix_time, ';
    for ( var i = 0, l = fields.length - 1; i < l; i++) {
        sql_command += "?, ";
        command += 'data.temperature_record[0].' + fields[i] + ', ';
    }
    sql_command += "?)";
    command += 'data.temperature_record[0].' + fields[l] + ');';
    var statement = db.prepare(sql_command);

    // Insert values into prepared statement
    eval(command);
    // Execute the statement
    statement.finalize();
}

function tempHandler(callback) {
    return function(err, buffer) {
        var temp_record = {
            temperature_record : [ {
                unix_time : Date.now()
            } ]
        };
        for ( var i = 0, l = buffer.length; i < l; i++) {
            if (err) {
                console.error(err);
                process.exit(1);
            }

            // Read data from file (using fast node ASCII encoding).
            var data = buffer[i].toString('ascii').split(" "); // Split by
            // space

            // Extract temperature from string and divide by 1000 to give
            // celsius
            var temp = parseFloat(data[data.length - 1].split("=")[1]) / 1000.0;

            // Round to one decimal place
            temp = Math.round(temp * 10) / 10;

            // Add date/time to temperature
            temp_record.temperature_record[0][fields[i]] = temp;
        }

        // Execute call back with data
        callback(temp_record);
    };
}

// Read current temperature from sensor
function readTemp(callback) {
    async.map(files, fs.readFile, tempHandler(callback));
};

// Create a wrapper function which we'll use specifically for logging
function logTemp(interval) {
    // Call the readTemp function with the insertTemp function as output to get
    // initial reading
    readTemp(insertTemp);
    // Set the repeat interval (milliseconds). Third argument is passed as
    // callback function to first (i.e. readTemp(insertTemp)).
    setInterval(readTemp, interval, insertTemp);
};

// Get temperature records from database
function selectTemp(num_records, start_date, callback) {
    // - Num records is an SQL filter from latest record back trough time
    // series,
    // - start_date is the first date in the time-series required,
    // - callback is the output function
    db
            .all(
                    "SELECT * FROM (SELECT * FROM temperature_records WHERE unix_time > (strftime('%s',?)*1000) ORDER BY unix_time DESC LIMIT ?) ORDER BY unix_time;",
                    start_date, num_records, function(err, rows) {
                        if (err) {
                            response.writeHead(500, {
                                "Content-type" : "text/html"
                            });
                            response.end(err + "\n");
                            console.log('Error serving querying database. '
                                    + err);
                            return;
                        }
                        data = {
                            temperature_record : [ rows ]
                        };
                        callback(data);
                    });
};

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
        selectTemp(num_obs, start_date, json_handler(response));
        return;
    }

    // Test to see if it's a request for current temperature
    if (pathfile == '/temperature_now.json') {
        readTemp(json_handler(response));
        return;
    }

    if (pathfile == '/get_log') {
        selectTemp(-1, '1970-01-01T00:00', csv_handler(response));
        return;
    }

    if (pathfile == '/') {
        pathfile = '/index.htm';
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

// Start temperature logging.
logTemp(msecs);
// Send a message to console
console.log('Server is logging to database at ' + msecs + 'ms intervals');
// Enable server
server.listen(7000);
// Log message
console.log('Server running at http://localhost:7000');
