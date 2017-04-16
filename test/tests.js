var vows = require('vows');
var assert = require('assert');
var sqlite3 = require('sqlite3');
var logger = require('../logger');
var fs = require('fs');

var fields = [ 'Fermenter', 'Chamber', 'Room' ];
var db = new sqlite3.Database('test.db');

vows.describe('logger').addBatch({
    'constructed and ' : {
        topic : function () {
            return new logger.logger(fields, db);
        },
        'table created and ' : {
            topic : function(db_logger) {
                db_logger.create();
                return db_logger;
            },
            'data added and ' : {
                topic : function(db_logger) {
                    var temp_record = {
                            temperature_record : [ {
                                unix_time : Date.now()
                            } ]
                        };
                    var temp = 10;
                    for (var i = 0, l = fields.length; i < l; i++) {
                        temp_record.temperature_record[0][fields[i]] = temp;                        
                    }
                    db_logger.write(temp_record);
                    return db_logger;
                },
                'queried' : {
                    topic : function(db_logger) {
                        var num_records = 1;
                        var start_date = '1970-01-01T00:00';
                        var that = this;
                        db_logger.query(num_records, start_date, function (data) {
                            that.callback(null, data);
                        });
                        
                    },
                    'checking data' : function(data) {
                        assert.isTrue(data.hasOwnProperty('temperature_record'));
                        assert.isTrue(data.temperature_record[0][0].hasOwnProperty('unix_time'));
                        for (var i = 0, l = fields.length; i < l; i++) {                    
                            assert.isTrue(data.temperature_record[0][0].hasOwnProperty(fields[i]));
                        }
                    }
                }
            }
        }
    }
}).export(module);
