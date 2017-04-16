//logger.js - Functions to log sensor readings to SQLite database

function logger(fields, database) {
    this.create = function() {
        database.serialize(function() {
            database.run("CREATE TABLE if not exists temperature_records(unix_time bigint primary key, Fermenter real, Chamber real, Room real);");            
        });
    };
    
    // Write a single temperature record in JSON format to database table.
    this.write = function(data) {
        // data is a javascript object
        var sql_command = "INSERT INTO temperature_records VALUES (?, ";
        var command = 'statement.run(data.temperature_record[0].unix_time, ';
        for ( var i = 0, l = fields.length - 1; i < l; i++) {
            sql_command += "?, ";
            command += 'data.temperature_record[0].' + fields[i] + ', ';
        }
        sql_command += "?)";
        command += 'data.temperature_record[0].' + fields[l] + ');';
        var statement = database.prepare(sql_command);

        // Insert values into prepared statement
        eval(command);
        // Execute the statement
        statement.finalize();
    };
    // Get temperature records from database
    this.query = function(num_records, start_date, callback) {
        // - Num records is an SQL filter from latest record back trough time
        // series,
        // - start_date is the first date in the time-series required,
        // - callback is the output function
        database
                .all(
                        "SELECT * FROM (SELECT * FROM temperature_records WHERE unix_time > (strftime('%s',?)*1000) ORDER BY unix_time DESC LIMIT ?) ORDER BY unix_time;",
                        start_date, num_records, function(err, rows) {
                            if (err) {
                                console.log('Error serving querying database. '
                                        + err);
                                response.writeHead(500, {
                                    "Content-type" : "text/html"
                                });
                                response.end(err + "\n");
                                return;
                            }
                            data = {
                                temperature_record : [ rows ]
                            };
                            callback(data);
                        });
    };
}
//Export the logging function.
exports.logger = logger;
