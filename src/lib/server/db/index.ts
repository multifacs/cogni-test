import Database from 'better-sqlite3';
import type { StroopRecord, User } from './types';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = "./data/cogni.db"
const db = new Database(DB_PATH, { verbose: console.log });

export namespace Users {
  const sql = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    surname TEXT,
    birth TEXT,
    sex TEXT
  );
  `;
  const stmnt = db.prepare(sql).run();

  export function addUser(data: FormData): string {
    const id = uuidv4();
    const sql = `
    insert into users (id, name, surname, birth, sex)
    values (?, ?, ?, ?, ?) 
    `;
    const birth = [data.get('day').padStart(2, '0'), data.get('month').padStart(2, '0'), data.get('year')].join('.');
    const stmnt = db.prepare(sql).run(id, data.get('name'), data.get('surname'), birth, data.get('sex'));
    return id;
  };
  export function getUserById(id: string): User {
    const user = {} as User;
    const sql = `
    select * from users where `;
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const userData = stmt.get(id);
    console.log(userData)

    return user;
  };
  export function getUserId(user: User): string | null {
    const sql = `
    select * from users where name = $name and surname = $surname and birth = $birth and sex = $sex`;
    const stmt = db.prepare(sql);
    const userData = stmt.get(user) as User;
    
    if (userData) {
      return userData.id
    }

    return null;
  };
}

namespace Stroop {
  const sql = `
  CREATE TABLE IF NOT EXISTS records (id INTEGER PRIMARY KEY AUTOINCREMENT, score INTEGER);
  `;
  const stmnt = db.prepare(sql).run();

  export function getRecords(): StroopRecord[] {
    const sql = `
  select * from records 
  `;
    const stmnt = db.prepare(sql);
    const rows = stmnt.all();
    return rows as StroopRecord[];
  }

  export function makeRecord(score: number): void {
    const sql = `
  insert into records (score) values ($score) 
  `;
    const stmnt = db.prepare(sql).run({ score });
    return;
  }
}