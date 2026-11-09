import type { DBSchema } from 'idb';
import type {
  Collaborator,
  Connection,
  FieldNote,
  Place,
  Post,
  StoredImage,
  Tag,
  Theme,
} from '../types/models';

export const DB_NAME = 'musas-sonideras-db';
export const DB_VERSION = 3;

export interface MusasDB extends DBSchema {
  collaborators: {
    key: string;
    value: Collaborator;
    indexes: { 'by-name': string };
  };
  posts: {
    key: string;
    value: Post;
    indexes: { 'by-date': string };
  };
  places: {
    key: string;
    value: Place;
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
  themes: {
    key: string;
    value: Theme;
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
