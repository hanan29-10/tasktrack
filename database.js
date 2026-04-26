const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./tasktrack.db', (err) => {
  if (err) {
    console.log("Error connecting to database");
  } else {
    console.log("Connected to SQLite database");
  }
});

db.run(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  password TEXT
)
`);

db.run(`
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  title TEXT,
  due_date TEXT,
  status TEXT
)
`);

module.exports = db;