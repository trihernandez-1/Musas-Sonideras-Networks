import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { MusasDB } from './schema';
import { DB_NAME, DB_VERSION } from './schema';

let dbPromise: Promise<IDBPDatabase<MusasDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<MusasDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MusasDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const collaborators = db.createObjectStore('collaborators', { keyPath: 'id' });
        collaborators.createIndex('by-name', 'name');

        const posts = db.createObjectStore('posts', { keyPath: 'id' });
        posts.createIndex('by-date', 'postDate');
        posts.createIndex('by-event', 'eventId');

        db.createObjectStore('places', { keyPath: 'id' });

        const events = db.createObjectStore('events', { keyPath: 'id' });
        events.createIndex('by-date', 'startDate');
        events.createIndex('by-place', 'placeId');

        const connections = db.createObjectStore('connections', { keyPath: 'id' });
        connections.createIndex('by-a', 'collaboratorAId');
        connections.createIndex('by-b', 'collaboratorBId');

        db.createObjectStore('tags', { keyPath: 'id' });
        db.createObjectStore('images', { keyPath: 'id' });
        db.createObjectStore('fieldNotes', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

/** Wipes every object store. Used before importing a backup, or to clear demo data. */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const storeNames = [
    'collaborators',
    'posts',
    'places',
    'events',
    'connections',
    'tags',
    'images',
    'fieldNotes',
  ] as const;
  const tx = db.transaction(storeNames, 'readwrite');
  await Promise.all(storeNames.map((name) => tx.objectStore(name).clear()));
  await tx.done;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}
