import type { FieldNote, ID, Post } from '../types/models';

/** The old standalone "event" record shape, from before posts and events merged into one
 * record type. Kept only so existing data (a live database still on the old schema, or an
 * older exported backup) can be folded into today's Post shape without losing anything. */
export interface LegacyEventRecord {
  id: ID;
  name: string;
  startDate: string;
  endDate?: string;
  placeId?: ID;
  description: string;
  interpretation: string;
  postIds: ID[];
  collaboratorIds: ID[];
  collaboratorRoles?: Record<ID, string>;
  tagIds: ID[];
  createdAt: string;
  updatedAt: string;
}

/** Converts an old event record into today's Post shape, keeping the same id so anything
 * that referenced it (a field note, a manual connection's evidence) still resolves. */
export function legacyEventToPost(event: LegacyEventRecord): Post {
  return {
    id: event.id,
    name: event.name,
    imageIds: [],
    postDate: event.startDate,
    endDate: event.endDate,
    captionNotes: event.description ?? '',
    interpretation: event.interpretation ?? '',
    collaboratorIds: event.collaboratorIds,
    collaboratorRoles: event.collaboratorRoles
      ? Object.fromEntries(Object.entries(event.collaboratorRoles).map(([cid, role]) => [cid, [role]]))
      : undefined,
    placeId: event.placeId,
    tagIds: event.tagIds,
    themeIds: [],
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

/** Folds an old field note's `linkedEventIds` (a runtime-only leftover from before posts and
 * events merged — the current FieldNote type no longer declares it) into `linkedPostIds`,
 * since an event is now just a post under the same id. Returns the note unchanged — safe to
 * call unconditionally — when there's nothing to merge. */
export function mergeLegacyLinkedEventIds(note: FieldNote): FieldNote {
  const legacyEventIds = (note as unknown as { linkedEventIds?: ID[] }).linkedEventIds;
  if (!legacyEventIds || legacyEventIds.length === 0) return note;
  const merged = Array.from(new Set([...(note.linkedPostIds ?? []), ...legacyEventIds]));
  return { ...note, linkedPostIds: merged };
}
