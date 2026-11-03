import { getDB, newId, nowISO } from './db';
import type {
  Collaborator,
  Connection,
  EventRecord,
  FieldNote,
  Place,
  Post,
  StoredImage,
  Tag,
  Theme,
} from '../types/models';

// ---------- Tags ----------

export async function getAllTags(): Promise<Tag[]> {
  const db = await getDB();
  return db.getAll('tags');
}

export async function upsertTag(tag: Tag): Promise<void> {
  const db = await getDB();
  await db.put('tags', tag);
}

export async function deleteTag(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('tags', id);
}

/** Finds a tag by exact (case-insensitive, accent-insensitive) label, or creates it. */
export async function findOrCreateTag(label: string): Promise<Tag> {
  const trimmed = label.trim();
  const tags = await getAllTags();
  const existing = tags.find((t) => normalizeForSearch(t.label) === normalizeForSearch(trimmed));
  if (existing) return existing;
  const tag: Tag = { id: newId(), label: trimmed };
  await upsertTag(tag);
  return tag;
}

/** Strips accents/diacritics for accent-insensitive search (á→a, ñ→n for matching only, never for display). */
export function normalizeForSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// ---------- Themes (thematic-analysis codes for posts) ----------

export async function getAllThemes(): Promise<Theme[]> {
  const db = await getDB();
  return db.getAll('themes');
}

export async function upsertTheme(theme: Theme): Promise<void> {
  const db = await getDB();
  await db.put('themes', theme);
}

export async function deleteTheme(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('themes', id);
}

/** Finds a theme by exact (case-insensitive, accent-insensitive) label, or creates it. */
export async function findOrCreateTheme(label: string): Promise<Theme> {
  const trimmed = label.trim();
  const themes = await getAllThemes();
  const existing = themes.find((t) => normalizeForSearch(t.label) === normalizeForSearch(trimmed));
  if (existing) return existing;
  const theme: Theme = { id: newId(), label: trimmed };
  await upsertTheme(theme);
  return theme;
}

// ---------- Images ----------

export async function saveImage(blob: Blob, fileName?: string): Promise<StoredImage> {
  const db = await getDB();
  const image: StoredImage = {
    id: newId(),
    blob,
    mimeType: blob.type || 'image/jpeg',
    fileName,
    createdAt: nowISO(),
  };
  await db.put('images', image);
  return image;
}

export async function getImage(id: string): Promise<StoredImage | undefined> {
  const db = await getDB();
  return db.get('images', id);
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('images', id);
}

export async function getAllImages(): Promise<StoredImage[]> {
  const db = await getDB();
  return db.getAll('images');
}

// ---------- Collaborators ----------

export async function getAllCollaborators(): Promise<Collaborator[]> {
  const db = await getDB();
  return db.getAll('collaborators');
}

export async function getCollaborator(id: string): Promise<Collaborator | undefined> {
  const db = await getDB();
  return db.get('collaborators', id);
}

export async function upsertCollaborator(
  c: Omit<Collaborator, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<Collaborator, 'id' | 'createdAt'>>,
): Promise<Collaborator> {
  const db = await getDB();
  const existing = c.id ? await db.get('collaborators', c.id) : undefined;
  const record: Collaborator = {
    ...c,
    id: c.id ?? newId(),
    createdAt: existing?.createdAt ?? c.createdAt ?? nowISO(),
    updatedAt: nowISO(),
  };
  await db.put('collaborators', record);
  return record;
}

export async function deleteCollaborator(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('collaborators', id);
  // Clean up manual connections referencing this collaborator; co-tagged ones
  // are rebuilt from posts, so they disappear naturally once posts are edited.
  const connections = await db.getAll('connections');
  const toDelete = connections.filter(
    (conn) => conn.type === 'manual' && (conn.collaboratorAId === id || conn.collaboratorBId === id),
  );
  const tx = db.transaction('connections', 'readwrite');
  await Promise.all(toDelete.map((conn) => tx.store.delete(conn.id)));
  await tx.done;
}

/** Saves a hand-dragged node position from the Network view, without bumping updatedAt
 * (repositioning isn't a content edit worth surfacing anywhere). */
export async function setCollaboratorPosition(id: string, x: number, y: number): Promise<void> {
  const db = await getDB();
  const c = await db.get('collaborators', id);
  if (!c) return;
  await db.put('collaborators', { ...c, pinnedX: x, pinnedY: y });
}

export async function clearAllCollaboratorPositions(): Promise<void> {
  const db = await getDB();
  const all = await db.getAll('collaborators');
  const tx = db.transaction('collaborators', 'readwrite');
  for (const c of all) {
    if (c.pinnedX !== undefined || c.pinnedY !== undefined) {
      await tx.store.put({ ...c, pinnedX: undefined, pinnedY: undefined });
    }
  }
  await tx.done;
}

/** Quick-create a collaborator from just a handle, used in the fast tagging flow. */
export async function quickCreateCollaborator(handle: string): Promise<Collaborator> {
  const cleaned = handle.trim().replace(/^@/, '');
  return upsertCollaborator({
    name: cleaned,
    instagramHandle: cleaned,
    description: '',
    tagIds: [],
    notes: '',
  });
}

// ---------- Posts ----------

export async function getAllPosts(): Promise<Post[]> {
  const db = await getDB();
  return db.getAll('posts');
}

export async function getPost(id: string): Promise<Post | undefined> {
  const db = await getDB();
  return db.get('posts', id);
}

export async function upsertPost(
  p: Omit<Post, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<Post, 'id' | 'createdAt'>>,
): Promise<Post> {
  const db = await getDB();
  const existing = p.id ? await db.get('posts', p.id) : undefined;
  const record: Post = {
    ...p,
    id: p.id ?? newId(),
    createdAt: existing?.createdAt ?? p.createdAt ?? nowISO(),
    updatedAt: nowISO(),
  };
  await db.put('posts', record);
  await rebuildCoTaggedConnections();
  await rebuildEventPostLinks();
  return record;
}

export async function deletePost(id: string): Promise<void> {
  const db = await getDB();
  const post = await db.get('posts', id);
  await db.delete('posts', id);
  if (post) {
    const tx = db.transaction('images', 'readwrite');
    await Promise.all(post.imageIds.map((imgId) => tx.store.delete(imgId)));
    await tx.done;
  }
  await rebuildCoTaggedConnections();
  await rebuildEventPostLinks();
}

/**
 * An event's postIds is derived data, like co-tagged connections: recomputed from every
 * post's eventId whenever a post is saved or deleted, so the two can never drift apart.
 */
export async function rebuildEventPostLinks(): Promise<void> {
  const db = await getDB();
  const [posts, events] = await Promise.all([db.getAll('posts'), db.getAll('events')]);

  const postIdsByEvent = new Map<string, string[]>();
  for (const post of posts) {
    if (!post.eventId) continue;
    const list = postIdsByEvent.get(post.eventId) ?? [];
    list.push(post.id);
    postIdsByEvent.set(post.eventId, list);
  }

  const tx = db.transaction('events', 'readwrite');
  for (const event of events) {
    const newPostIds = postIdsByEvent.get(event.id) ?? [];
    const unchanged =
      newPostIds.length === event.postIds.length &&
      newPostIds.every((pid) => event.postIds.includes(pid));
    if (!unchanged) {
      await tx.store.put({ ...event, postIds: newPostIds, updatedAt: nowISO() });
    }
  }
  await tx.done;
}

// ---------- Places ----------

export async function getAllPlaces(): Promise<Place[]> {
  const db = await getDB();
  return db.getAll('places');
}

export async function getPlace(id: string): Promise<Place | undefined> {
  const db = await getDB();
  return db.get('places', id);
}

export async function upsertPlace(
  p: Omit<Place, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<Place, 'id' | 'createdAt'>>,
): Promise<Place> {
  const db = await getDB();
  const existing = p.id ? await db.get('places', p.id) : undefined;
  const record: Place = {
    ...p,
    id: p.id ?? newId(),
    createdAt: existing?.createdAt ?? p.createdAt ?? nowISO(),
    updatedAt: nowISO(),
  };
  await db.put('places', record);
  return record;
}

export async function deletePlace(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('places', id);
}

// ---------- Events ----------

export async function getAllEvents(): Promise<EventRecord[]> {
  const db = await getDB();
  return db.getAll('events');
}

export async function getEvent(id: string): Promise<EventRecord | undefined> {
  const db = await getDB();
  return db.get('events', id);
}

export async function upsertEvent(
  e: Omit<EventRecord, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<EventRecord, 'id' | 'createdAt'>>,
): Promise<EventRecord> {
  const db = await getDB();
  const existing = e.id ? await db.get('events', e.id) : undefined;
  const record: EventRecord = {
    ...e,
    id: e.id ?? newId(),
    createdAt: existing?.createdAt ?? e.createdAt ?? nowISO(),
    updatedAt: nowISO(),
  };
  await db.put('events', record);
  return record;
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('events', id);
}

// ---------- Field Notes ----------

export async function getAllFieldNotes(): Promise<FieldNote[]> {
  const db = await getDB();
  return db.getAll('fieldNotes');
}

export async function upsertFieldNote(
  n: Omit<FieldNote, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<FieldNote, 'id' | 'createdAt'>>,
): Promise<FieldNote> {
  const db = await getDB();
  const existing = n.id ? await db.get('fieldNotes', n.id) : undefined;
  const record: FieldNote = {
    ...n,
    id: n.id ?? newId(),
    createdAt: existing?.createdAt ?? n.createdAt ?? nowISO(),
    updatedAt: nowISO(),
  };
  await db.put('fieldNotes', record);
  return record;
}

export async function deleteFieldNote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('fieldNotes', id);
}

// ---------- Connections ----------

export async function getAllConnections(): Promise<Connection[]> {
  const db = await getDB();
  return db.getAll('connections');
}

function coTaggedId(aId: string, bId: string): string {
  const [x, y] = [aId, bId].sort();
  return `cotag__${x}__${y}`;
}

/**
 * Co-tagged connections are derived data: recomputed from every post's
 * collaboratorIds whenever a post is saved or deleted. Manual connections
 * are untouched here.
 */
export async function rebuildCoTaggedConnections(): Promise<void> {
  const db = await getDB();
  const posts = await db.getAll('posts');

  const pairs = new Map<string, { aId: string; bId: string; postIds: string[] }>();
  for (const post of posts) {
    const ids = Array.from(new Set(post.collaboratorIds));
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const [aId, bId] = [ids[i], ids[j]].sort();
        const key = coTaggedId(aId, bId);
        const entry = pairs.get(key) ?? { aId, bId, postIds: [] };
        entry.postIds.push(post.id);
        pairs.set(key, entry);
      }
    }
  }

  const existingConnections = await db.getAll('connections');
  const existingCoTagged = new Map(
    existingConnections.filter((c) => c.type === 'co-tagged').map((c) => [c.id, c]),
  );

  const tx = db.transaction('connections', 'readwrite');
  // Upsert current pairs.
  for (const [id, { aId, bId, postIds }] of pairs) {
    const prior = existingCoTagged.get(id);
    const record: Connection = {
      id,
      type: 'co-tagged',
      collaboratorAId: aId,
      collaboratorBId: bId,
      postIds,
      createdAt: prior?.createdAt ?? nowISO(),
      updatedAt: nowISO(),
    };
    await tx.store.put(record);
  }
  // Delete co-tagged connections for pairs that no longer co-occur.
  for (const id of existingCoTagged.keys()) {
    if (!pairs.has(id)) {
      await tx.store.delete(id);
    }
  }
  await tx.done;
}

export async function upsertManualConnection(
  c: Omit<Connection, 'id' | 'type' | 'postIds' | 'createdAt' | 'updatedAt'> &
    Partial<Pick<Connection, 'id' | 'createdAt'>>,
): Promise<Connection> {
  const db = await getDB();
  const existing = c.id ? await db.get('connections', c.id) : undefined;
  const record: Connection = {
    ...c,
    id: c.id ?? newId(),
    type: 'manual',
    postIds: [],
    createdAt: existing?.createdAt ?? c.createdAt ?? nowISO(),
    updatedAt: nowISO(),
  };
  await db.put('connections', record);
  return record;
}

export async function deleteConnection(id: string): Promise<void> {
  const db = await getDB();
  const conn = await db.get('connections', id);
  if (conn?.type === 'co-tagged') {
    throw new Error('Co-tagged connections are derived from posts; edit the posts instead.');
  }
  await db.delete('connections', id);
}

// Dates of posts that produced a given co-tagged connection, for display.
export async function getPostDatesForConnection(conn: Connection): Promise<string[]> {
  const db = await getDB();
  const dates: string[] = [];
  for (const postId of conn.postIds) {
    const post = await db.get('posts', postId);
    if (post) dates.push(post.postDate);
  }
  return dates.sort();
}
