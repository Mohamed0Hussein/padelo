import * as SQLite from 'expo-sqlite';

/**
 * Persistence: expo-sqlite, no ORM (Drizzle skipped on purpose; the app keeps everything in memory in Zustand
 * and writes each document through). One table of JSON documents keyed by (kind, id).
 */
let db: SQLite.SQLiteDatabase | null = null;
let queue: Promise<unknown> = Promise.resolve();

export async function openDb() {
  db = await SQLite.openDatabaseAsync('padelo.db');
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS docs (kind TEXT NOT NULL, id TEXT NOT NULL, json TEXT NOT NULL, PRIMARY KEY (kind, id));',
  );
}

export async function loadAll<T>(kind: string): Promise<T[]> {
  const rows = await db!.getAllAsync<{ json: string }>('SELECT json FROM docs WHERE kind = ?', kind);
  return rows.map((r) => JSON.parse(r.json) as T);
}

const run = (fn: () => Promise<unknown>) => {
  queue = queue.then(fn).catch((e) => console.warn('db write failed', e));
};

export function saveDoc(kind: string, id: string, doc: unknown) {
  const json = JSON.stringify(doc);
  run(() => db!.runAsync('INSERT OR REPLACE INTO docs (kind, id, json) VALUES (?, ?, ?)', kind, id, json));
}

export function deleteDoc(kind: string, id: string) {
  run(() => db!.runAsync('DELETE FROM docs WHERE kind = ? AND id = ?', kind, id));
}
