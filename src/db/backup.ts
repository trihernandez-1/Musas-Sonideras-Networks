import JSZip from 'jszip';
import { getDB, clearAllData } from './db';
import { downloadBlob } from '../utils/download';
import type {
  Collaborator,
  Connection,
  EventRecord,
  FieldNote,
  Place,
  Post,
  Tag,
} from '../types/models';

interface BackupManifest {
  appName: 'musas-sonideras';
  formatVersion: 1;
  exportedAt: string;
  counts: Record<string, number>;
}

interface BackupData {
  collaborators: Collaborator[];
  posts: Post[];
  places: Place[];
  events: EventRecord[];
  connections: Connection[];
  tags: Tag[];
  fieldNotes: FieldNote[];
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Exports the entire project (data + images) as one .zip file and triggers a browser download. */
export async function exportBackup(): Promise<void> {
  const db = await getDB();
  const [collaborators, posts, places, events, connections, tags, fieldNotes, images] =
    await Promise.all([
      db.getAll('collaborators'),
      db.getAll('posts'),
      db.getAll('places'),
      db.getAll('events'),
      db.getAll('connections'),
      db.getAll('tags'),
      db.getAll('fieldNotes'),
      db.getAll('images'),
    ]);

  const zip = new JSZip();
  const data: BackupData = { collaborators, posts, places, events, connections, tags, fieldNotes };

  const manifest: BackupManifest = {
    appName: 'musas-sonideras',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    counts: {
      collaborators: collaborators.length,
      posts: posts.length,
      places: places.length,
      events: events.length,
      connections: connections.length,
      tags: tags.length,
      fieldNotes: fieldNotes.length,
      images: images.length,
    },
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('data.json', JSON.stringify(data, null, 2));

  const imagesFolder = zip.folder('images');
  const imageIndex: { id: string; fileName: string; mimeType: string; originalFileName?: string }[] = [];
  for (const image of images) {
    const ext = EXT_BY_MIME[image.mimeType] ?? 'bin';
    const fileName = `${image.id}.${ext}`;
    imagesFolder?.file(fileName, image.blob);
    imageIndex.push({
      id: image.id,
      fileName,
      mimeType: image.mimeType,
      originalFileName: image.fileName,
    });
  }
  zip.file('images-index.json', JSON.stringify(imageIndex, null, 2));

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const dateStamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `musas-sonideras-backup-${dateStamp}.zip`);
}

export interface ImportSummary {
  counts: Record<string, number>;
  exportedAt: string;
}

/**
 * Imports a previously exported .zip, replacing all current data.
 * Caller is responsible for confirming this destructive action with the user first.
 */
export async function importBackup(file: File | Blob): Promise<ImportSummary> {
  const zip = await JSZip.loadAsync(file);

  const manifestText = await zip.file('manifest.json')?.async('string');
  const dataText = await zip.file('data.json')?.async('string');
  const imageIndexText = await zip.file('images-index.json')?.async('string');
  if (!manifestText || !dataText || !imageIndexText) {
    throw new Error('This file does not look like a Musas Sonideras backup.');
  }

  const manifest: BackupManifest = JSON.parse(manifestText);
  if (manifest.appName !== 'musas-sonideras') {
    throw new Error('This file does not look like a Musas Sonideras backup.');
  }
  const data: BackupData = JSON.parse(dataText);
  const imageIndex: { id: string; fileName: string; mimeType: string; originalFileName?: string }[] =
    JSON.parse(imageIndexText);

  await clearAllData();
  const db = await getDB();

  const tx = db.transaction(
    ['collaborators', 'posts', 'places', 'events', 'connections', 'tags', 'fieldNotes', 'images'],
    'readwrite',
  );
  await Promise.all([
    ...data.collaborators.map((c) => tx.objectStore('collaborators').put(c)),
    ...data.posts.map((p) => tx.objectStore('posts').put(p)),
    ...data.places.map((p) => tx.objectStore('places').put(p)),
    ...data.events.map((e) => tx.objectStore('events').put(e)),
    ...data.connections.map((c) => tx.objectStore('connections').put(c)),
    ...data.tags.map((t) => tx.objectStore('tags').put(t)),
    ...data.fieldNotes.map((n) => tx.objectStore('fieldNotes').put(n)),
  ]);
  await tx.done;

  // Decompress every image blob BEFORE opening the IndexedDB transaction: an
  // IDB transaction auto-commits if it sits idle while an unrelated await
  // (like zip decompression) runs, so none of that work can happen inside it.
  const decodedImages = await Promise.all(
    imageIndex.map(async (entry) => {
      const fileEntry = zip.file(`images/${entry.fileName}`);
      if (!fileEntry) return null;
      const blob = await fileEntry.async('blob');
      return {
        id: entry.id,
        blob,
        mimeType: entry.mimeType,
        fileName: entry.originalFileName,
        createdAt: manifest.exportedAt,
      };
    }),
  );

  const imageTx = db.transaction('images', 'readwrite');
  for (const image of decodedImages) {
    if (image) imageTx.store.put(image);
  }
  await imageTx.done;

  return { counts: manifest.counts, exportedAt: manifest.exportedAt };
}
