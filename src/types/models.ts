// Core data model for the Musas Sonideras research app.
// IDs are generated client-side (crypto.randomUUID) since there is no backend.

export type ID = string;

/** A tag the researcher created, reused as a chip. Tags have no fixed taxonomy. */
export interface Tag {
  id: ID;
  label: string;
  /** Hex color, e.g. "#e94f37". Optional — falls back to a default palette color by hash. */
  color?: string;
}

/** A thematic-analysis code for posts — same shape as Tag, but kept in its own pool so it
 * doesn't mix into the general-purpose Tags used everywhere else (collaborators, events,
 * places). Created freely and reused via a dropdown, same as tags. */
export type Theme = Tag;

/** A stored image blob (profile pictures, post screenshots), kept out of the main record for lazy loading. */
export interface StoredImage {
  id: ID;
  blob: Blob;
  mimeType: string;
  /** Original filename, if known, for export. */
  fileName?: string;
  createdAt: string; // ISO date
}

export interface Collaborator {
  id: ID;
  name: string;
  instagramHandle?: string;
  description: string;
  tagIds: ID[];
  firstSeenDate?: string; // ISO date
  notes: string;
  profileImageId?: ID;
  /** Marks this collaborator as the network's anchor (e.g. Musas Sonideras itself) —
   * always shown in the Network view, unaffected by tag/date filters. */
  isCentral?: boolean;
  /** Pinned position in the Network view, set by dragging. Lets the researcher hand-arrange
   * a layout for a thesis screenshot without the force simulation drifting it back. */
  pinnedX?: number;
  pinnedY?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * A single record: a screenshot, an occasion, or both at once — there is no separate "event"
 * type. A quick screenshot post and a named multi-day gathering are the same kind of record,
 * just with different fields filled in: `name`/`endDate`/`collaboratorRoles` matter more for
 * an occasion, `imageIds`/`postUrl` more for a screenshot, but nothing requires one or the
 * other.
 */
export interface Post {
  id: ID;
  /** Optional title for this record, e.g. "Baile Sonidero de Primavera" — leave blank for an
   * ordinary screenshot with no name of its own. */
  name?: string;
  imageIds: ID[];
  postDate: string; // ISO date — also the start date for a multi-day occasion
  /** Optional end date, for a record spanning more than one day. */
  endDate?: string;
  postUrl?: string;
  captionNotes: string;
  interpretation: string; // rich text stored as HTML
  collaboratorIds: ID[];
  /** What each collaborator did here, e.g. "DJ", "Venue", "Designer" — free text, keyed by
   * collaborator id. Optional and sparse: not every participant needs one noted. */
  collaboratorRoles?: Record<ID, string>;
  /** Where this happened, if that's meaningful — shows up as its own pin on the Map. */
  placeId?: ID;
  tagIds: ID[];
  /** Thematic-analysis codes for this post — a separate vocabulary from tagIds. */
  themeIds: ID[];
  createdAt: string;
  updatedAt: string;
}

export interface Place {
  id: ID;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  placeTypeTagIds: ID[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type ConnectionType = 'co-tagged' | 'manual';

export interface Connection {
  id: ID;
  type: ConnectionType;
  collaboratorAId: ID;
  collaboratorBId: ID;
  /** For co-tagged connections: auto-maintained list of posts that produced this edge. */
  postIds: ID[];
  /** For manual connections: researcher's own label, e.g. "mentored by", "shared sound system". */
  label?: string;
  note?: string;
  /** Free-text evidence description for manual connections (when not simply "see posts X, Y"). */
  evidenceText?: string;
  evidenceEventIds?: ID[];
  createdAt: string;
  updatedAt: string;
}

export interface FieldNote {
  id: ID;
  title: string;
  body: string; // rich text HTML
  linkedCollaboratorIds: ID[];
  linkedPostIds: ID[];
  linkedPlaceIds: ID[];
  createdAt: string;
  updatedAt: string;
}

/** A named constant: when sonidero culture was declared intangible cultural heritage of Mexico City. */
export const HERITAGE_DECLARATION_DATE = '2023-10-06';
