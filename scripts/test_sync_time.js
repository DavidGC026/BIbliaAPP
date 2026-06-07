const fs = require('fs');
const mysql = require('mysql2/promise');

const envFile = fs.readFileSync('/home/david/proyectos/BibliaAPP/.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

// Set environment variables for the test run
process.env.JOPLIN_API_URL = env.JOPLIN_API_URL;
process.env.MYSQL_HOST = "127.0.0.1";
process.env.MYSQL_PORT = "3306";
process.env.MYSQL_USER = env.MYSQL_USER;
process.env.MYSQL_PASSWORD = env.MYSQL_PASSWORD;
process.env.MYSQL_DATABASE = env.MYSQL_DATABASE;

// We need to override getPool from lib/mysql
const mysqlLib = require('../lib/mysql');
const pool = mysql.createPool({
  host: "127.0.0.1",
  port: 3306,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
});
mysqlLib.getPool = () => pool;

const { syncJoplin } = require('../lib/joplin');

const sessionId = "aXRON7XS0LuHGHwoXSQsgu";

async function runTest() {
  console.log("Starting syncJoplin performance test...");
  const start = Date.now();
  try {
    await syncJoplin(sessionId);
    console.log(`Sync completed successfully in ${(Date.now() - start) / 1000}s`);
  } catch (err) {
    console.error("Sync failed:", err);
  } finally {
    await pool.end();
  }
}

runTest();
