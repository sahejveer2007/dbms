// One-time setup: creates the database, tables and demo accounts.
require('dotenv').config();
const mysql = require('mysql2/promise'), fs = require('fs');
(async () => {
  let c;
  try {
    c = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '', multipleStatements: true
    });
  } catch (e) {
    console.log('\nCould not connect to MySQL: ' + e.message);
    console.log('Check that MySQL is running and that DB_USER / DB_PASS in your .env file are correct.\n');
    process.exit(1);
  }
  await c.query(fs.readFileSync(__dirname + '/schema.sql', 'utf8'));
  await c.end();
  console.log('Database and tables created.');
  require('./seed');
})();
