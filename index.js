let aws = require('aws-sdk');
let mysql = require('mysql');
let moment = require('moment');
let spawn = require('child_process').spawn;


exports.handler = function(event, context) {

  let ignoredDatabases = ['mysql', 'performance_schema', 'innodb', 'information_schema'];
  let date = moment();
  process.env.EXPORT_S3_PATH = (process.env.EXPORT_S3_PATH || '')
  .replace(/%YYYY/, date.format('YYYY'))
  .replace(/%YY/, date.format('YY'))
  .replace(/%MM/, date.format('MM'))
  .replace(/%M/, date.format('M'))
  .replace(/%DD/, date.format('DD'))
  .replace(/%D/, date.format('D'));

  let connection = mysql.createConnection({
    host: process.env.EXPORT_DB_HOST,
    user: process.env.EXPORT_DB_USERNAME,
    password: process.env.EXPORT_DB_PASSWORD
  });

  connection.connect();
  connection.query('SHOW DATABASES', function(err, databases, fields) {
    databases.map((database) => database.Database)
    .filter((database) => ignoredDatabases.indexOf(database) === -1)
    .forEach(backupDatabase)
  });
  connection.end();
}


function backupDatabase(database) {
  let env = Object.create(process.env);
  env.EXPORT_DB_NAME = database;
  let backup = spawn('./export.sh', [], {env: env})

  backup.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  backup.stderr.on('data', (data) => {
    console.error(data.toString());
  });

  backup.on('close', (code) => {
    if (code === 0) {
      console.log(`Successfully exported ${env.EXPORT_DB_NAME}`);
    } else {
      console.error(`Error exporting ${env.EXPORT_DB_NAME}`);
    }
  });
}


