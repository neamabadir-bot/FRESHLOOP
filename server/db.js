// SQLite database (Node's built-in node:sqlite module – no native packages needed).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_DB = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'freshloop.db');

// Loaded via require so test tooling (Vite/Vitest) does not try to bundle this newer built-in module.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  language      TEXT NOT NULL DEFAULT 'en',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS receipts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store      TEXT,
  raw_text   TEXT,
  item_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per food product in the user's personal inventory.
-- Removed products are kept (removed_at set) so consumed/thrown reports are not lost.
CREATE TABLE IF NOT EXISTS items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receipt_id     INTEGER REFERENCES receipts(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  quantity       REAL NOT NULL DEFAULT 1,
  unit           TEXT NOT NULL DEFAULT 'pcs',
  price          REAL,
  expiry_date    TEXT,              -- YYYY-MM-DD, entered/confirmed by the user
  expiry_type    TEXT NOT NULL DEFAULT 'use_by' CHECK (expiry_type IN ('use_by','best_before')),
  source         TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','receipt')),
  last_checked_at TEXT,             -- last time the user confirmed the remaining quantity
  removed_at     TEXT,
  removal_type   TEXT CHECK (removal_type IN ('consumed','thrown')),
  removal_reason TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id, removed_at);

CREATE TABLE IF NOT EXISTS notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id     INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('three_days','expiry_day')),
  expiry_date TEXT NOT NULL,        -- the date the alert was generated for (re-alert if the date changes)
  read_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (item_id, kind, expiry_date)
);
`;

export function openDb(file = process.env.DB_FILE || DEFAULT_DB) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return db;
}
