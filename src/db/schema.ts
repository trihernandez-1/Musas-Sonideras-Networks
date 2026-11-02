import type { DBSchema } from 'idb';
import type {
  Collaborator,
  Connection,
  EventRecord,
  FieldNote,
  Place,
  Post,
  StoredImage,
  Tag,
} from '../types/models';

export const DB_NAME = 'musas-sonideras-db';
export const DB_VERSION = 1;

export interface MusasDB extends DBSchema {
  collaborators: {
    key: string;
    value: Collaborator;
    indexes: { 'by-name': string };
  };
  posts: {
    key: string;
    value: Post;
    indexes: { 'by-date': string; 'by-event': string };
  };
  places: {
    key: string;
    value: Place;
  };
  events: {
    key: string;
    value: EventRecord;
    indexes: { 'by-date': string; 'by-place': string };
  };
  connections: {
    key: string;
    value: Connection;
    indexes: { 'by-a': string; 'by-b': string };
  };
  tags: {
    key: string;
    value: Tag;
  };
  images: {
    key: string;
    value: StoredImage;
  };
  fieldNotes: {
    key: string;
    value: FieldNote;
  };
}
