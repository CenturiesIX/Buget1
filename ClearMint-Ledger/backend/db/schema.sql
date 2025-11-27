PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  amount REAL NOT NULL CHECK(amount > 0),
  category_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  currency TEXT NOT NULL DEFAULT '$',
  animations_enabled INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO settings (id, currency, animations_enabled) VALUES (1, '$', 1);
INSERT OR IGNORE INTO categories (id, name, color) VALUES (1, 'General', '#7bcfa7');
