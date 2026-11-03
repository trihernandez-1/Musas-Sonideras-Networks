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

export interface Post {
  id: ID;
  imageIds: ID[];
  postDate: string; // ISO date
  postUrl?: string;
  captionNotes: string;
  interpretation: string; // rich text stored as HTML
  collaboratorIds: ID[];
  eventId?: ID;
  tagIds: ID[];
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

export interface EventRecord {
  id: ID;
  name: string;
  startDate: string; // ISO date
  endDate?: string; // ISO date, optional for multi-day events
  placeId?: ID;
  description: string;
  interpretation: string;
  postIds: ID[];
  collaboratorIds: ID[];
  tagIds: ID[];
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
  linkedEventIds: ID[];
  linkedPlaceIds: ID[];
  createdAt: string;
  updatedAt: string;
}

/** A named constant: when sonidero culture was declared intangible cultural heritage of Mexico City. */
export const HERITAGE_DECLARATION_DATE = '2023-10-06';
