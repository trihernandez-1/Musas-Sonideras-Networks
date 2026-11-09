import { openDB } from 'idb';
import type { IDBPDatabase, IDBPTransaction } from 'idb';
import type { MusasDB } from './schema';
import { DB_NAME, DB_VERSION } from './schema';
import { legacyEventToPost, mergeLegacyLinkedEventIds } from './legacyMigration';

let dbPromise: Promise<IDBPDatabase<MusasDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<MusasDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MusasDB>(DB_NAME, DB_VERSION, {
      // Guarded with `contains` checks (rather than branching on oldVersion) so this
      // same upgrade function works whether a store already exists from an earlier
      // version or is being created fresh — no need to track version history by hand.
      async upgrade(db, _oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains('collaborators')) {
          const collaborators = db.createObjectStore('collaborators', { keyPath: 'id' });
          collaborators.createIndex('by-name', 'name');
        }

        let posts;
        if (!db.objectStoreNames.contains('posts')) {
          posts = db.createObjectStore('posts', { keyPath: 'id' });
          posts.createIndex('by-date', 'postDate');
        } else {
          posts = transaction.objectStore('posts');
          // Posts and events merged into one record type — the old per-post 'by-event'
          // index has nothing left to index. Cast needed since the current schema no
          // longer declares that index name as a valid literal.
          const legacyPostsStore = posts as unknown as { indexNames: DOMStringList; deleteIndex(name: string): void };
          if (legacyPostsStore.indexNames.contains('by-event')) {
            legacyPostsStore.deleteIndex('by-event');
          }
        }

        if (!db.objectStoreNames.contains('places')) {
          db.createObjectStore('places', { keyPath: 'id' });
        }

        // Events used to be their own store, with posts optionally linking to one by id.
        // They're now the same record type as posts, so fold every existing event into the
        // posts store (keeping its id, so anything that referenced it — a field note, an
        // export — still resolves) and drop the events store entirely. Guarded so this only
        // ever runs once, on a database that still has an 'events' store from before.
        const legacyDb = db as unknown as {
          objectStoreNames: { contains(name: string): boolean };
          deleteObjectStore(name: string): void;
        };
        if (legacyDb.objectStoreNames.contains('events')) {
          const legacyTx = transaction as unknown as IDBPTransaction<Record<string, unknown>, string[], 'versionchange'>;
          const eventsStore = legacyTx.objectStore('events');
          const legacyEvents = await eventsStore.getAll();
          for (const legacyEvent of legacyEvents) {
            await posts.put(legacyEventToPost(legacyEvent));
          }
          legacyDb.deleteObjectStore('events');
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

        let fieldNotes;
        if (!db.objectStoreNames.contains('fieldNotes')) {
          fieldNotes = db.createObjectStore('fieldNotes', { keyPath: 'id' });
        } else {
          fieldNotes = transaction.objectStore('fieldNotes');
        }
        if (!db.objectStoreNames.contains('themes')) {
          db.createObjectStore('themes', { keyPath: 'id' });
        }

        // Field notes could link to an event separately from a post — now that an event is
        // just a post, fold linkedEventIds into linkedPostIds (same ids, carried over above).
        const existingNotes = await fieldNotes.getAll();
        for (const note of existingNotes) {
          await fieldNotes.put(mergeLegacyLinkedEventIds(note));
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
