import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type Db = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  city_label TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  country_code TEXT NOT NULL,
  climate_zone TEXT NOT NULL,
  climate_estimated INTEGER NOT NULL DEFAULT 0,
  hemisphere TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  theme TEXT NOT NULL DEFAULT 'light',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  attempted_at INTEGER NOT NULL,
  success INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts (email, attempted_at);
CREATE TABLE IF NOT EXISTS farm_animals (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  animal_id TEXT NOT NULL,
  count INTEGER NOT NULL CHECK (count BETWEEN 1 AND 100000),
  PRIMARY KEY (user_id, animal_id)
);
CREATE TABLE IF NOT EXISTS farm_crops (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crop_id TEXT NOT NULL,
  PRIMARY KEY (user_id, crop_id)
);
CREATE TABLE IF NOT EXISTS weather_cache (
  key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  fetched_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS dev_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`;

export function openDb(file: string): Db {
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

let shared: Db | undefined;

export function getDb(): Db {
  if (!shared) {
    const file = process.env.DATABASE_PATH ?? "data/newfarmer.db";
    fs.mkdirSync(path.dirname(file), { recursive: true });
    shared = openDb(file);
  }
  return shared;
}
