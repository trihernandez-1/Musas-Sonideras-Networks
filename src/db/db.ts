import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { MusasDB } from './schema';
import { DB_NAME, DB_VERSION } from './schema';

let dbPromise: Promise<IDBPDatabase<MusasDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<MusasDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MusasDB>(DB_NAME, DB_VERSION, {
      // Guarded with `contains` checks (rather than branching on oldVersion) so this
      // same upgrade function works whether a store already exists from an earlier
      // version or is being created fresh — no need to track version history by hand.
      upgrade(db) {
        if (!db.objectStoreNames.contains('collaborators')) {
          const collaborators = db.createObjectStore('collaborators', { keyPath: 'id' });
          collaborators.createIndex('by-name', 'name');
        }
        if (!db.objectStoreNames.contains('posts')) {
          const posts = db.createObjectStore('posts', { keyPath: 'id' });
          posts.createIndex('by-date', 'postDate');
          posts.createIndex('by-event', 'eventId');
        }
        if (!db.objectStoreNames.contains('places')) {
          db.createObjectStore('places', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('events')) {
          const events = db.createObjectStore('events', { keyPath: 'id' });
          events.createIndex('by-date', 'startDate');
          events.createIndex('by-place', 'placeId');
        }
        if (!db.objectStoreNames.contains('connections')) {
          const connections = db.createObjectStore('connections', { keyPath: 'id' });
          connections.createIndex('by-a', 'collaboratorAId');
          connections.createIndex('by-b', 'collaboratorBId');
        }
        if (!db.objectStoreNames.contains('tags')) {
          db.createObjectStore('tags', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('fieldNotes')) {
          db.createObjectStore('fieldNotes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('themes')) {
          db.createObjectStore('themes', { keyPath: 'id' });
        }
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
    'themes',
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
