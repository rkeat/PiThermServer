//sensors.js - NodeJS sensor prototypes for the PiThermServer project.

/* The concept of this module is to provide a format for different sensors 
 connected to the Pi to be accessed in NodeJS scripts. For example note that the 
 DS18B20 sensor is exported as 'temperature', to make it more human-friendly in 
 the server script.

 We can then create an instance of the sensor in our server script by doing:

 var thermo = new sensors.temperature();

 Currently handles reading temperature data from DS18B20 sensor. My serial 
 number: 28-00000400a88a

 Tom Holderness (C) 25/01/2013

 References: http://www.cl.cam.ac.uk/freshers/raspberrypi/tutorials/temperature/
 */

var fs = require('fs');
var async = require('async');

function tempHandler(fields, callback) {
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
};

//Create function reference for DS18B20 sensor
//Serial number for sensor is in /sys/bus/w1/devices/
function DS18B20(files, fields) {
    
    // Sensor specific function to read current temperature
    this.read = function(callback) {
        async.map(files, fs.readFile, tempHandler(fields, callback));
    };
    
    this.log = function(logger, interval) {
        this.read(logger.write);
        setInterval(this.read, interval, logger.write);
        console.log('Server is logging to database at ' + interval + 'ms intervals');
    };
};

//Export the temperature sensor function
exports.temperature = DS18B20;
