import Database from 'better-sqlite3';
import type { StroopRecord, User } from './types';
import { v4 as uuidv4 } from 'uuid';
import { MODE, DB_PATH as DB_PATH_ENV } from '$env/static/private';
import { checkFormData, formDataToUser } from '$lib/index';
import { fail } from '@sveltejs/kit';

let DB_PATH
if (MODE == 'DEV') {
  DB_PATH = ":memory:"
} else {
  DB_PATH = DB_PATH_ENV
}

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
  export function addUser(data: FormData): string | null {
    if (!checkFormData(data)) {
      fail(500);
      return null;
    }
    const user = formDataToUser(null, data);
    let id = Users.getUserId(user);

    if (id) {
      return id;
    }

    id = uuidv4();
    const sql = `
    insert into users (id, name, surname, birth, sex)
    values ($id, $name, $surname, $birth, $sex) 
    `;
    user.id = id;
    db.prepare(sql).run(user);
    return id;
  };
  export function getDevUser(): string | null {
    const devFormData = new FormData();
    devFormData.append("name", "debug");
    devFormData.append("surname", "user");
    devFormData.append("birth", "01-01-2001");
    devFormData.append("sex", "male");
    return addUser(devFormData);
  }
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