import Database from 'better-sqlite3';
import type { Record } from './types';

const DB_PATH = "./data/records.db"
// const DB_PATH = "./data/chinook.db"
// const DB_PATH = ":memory:"
const db = new Database(DB_PATH, { verbose: console.log });

const sql = `
  CREATE TABLE IF NOT EXISTS records (id INTEGER PRIMARY KEY AUTOINCREMENT, score INTEGER);
`;
const stmnt = db.prepare(sql).run();

export function getRecords(): Record[] {
  const sql = `
  select * from records 
  `;
  const stmnt = db.prepare(sql);
  const rows = stmnt.all();
  return rows as Record[];
}

export function makeRecord(score: number): void {
  const sql = `
  insert into records (score) values ($score) 
  `;
  const stmnt = db.prepare(sql).run({ score });
  return;
}