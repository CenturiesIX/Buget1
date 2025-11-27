const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'clearmint-ledger.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to database', err);
  }
});

db.serialize(() => {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  const statements = schema.split(/;\s*(?=CREATE|INSERT|PRAGMA|WITH|UPDATE|DELETE|DROP)/i).map((stmt) => stmt.trim()).filter(Boolean);
  db.run('PRAGMA foreign_keys = ON');
  statements.forEach((statement) => {
    db.run(statement, (err) => {
      if (err) {
        console.error('Schema execution error:', err.message, '\nStatement:', statement);
      }
    });
  });
});

function run(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function transactional(executor) {
  return new Promise(async (resolve, reject) => {
    db.serialize(async () => {
      try {
        await run('BEGIN');
        const result = await executor({ run, get, all });
        await run('COMMIT');
        resolve(result);
      } catch (error) {
        await run('ROLLBACK');
        reject(error);
      }
    });
  });
}

module.exports = {
  db,
  run,
  get,
  all,
  transactional
};
