// Builds CSV files shaped for direct import into Gephi (nodes/edges tables) or R (igraph).
// Column names are kept stable and documented in the README bundled with the export.

import JSZip from 'jszip';
import type { Collaborator, Connection, Place, Post } from '../types/models';
import { getAllCollaborators, getAllConnections, getAllPlaces, getAllPosts, getAllTags, getAllThemes } from '../db/repos';
import { downloadBlob, stripHtml } from './download';

function csvCell(value: string | number | boolean | undefined | null): string {
  const s = value === undefined || value === null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCSV(headers: string[], rows: (string | number | boolean | undefined | null)[][]): string {
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  return lines.join('\r\n');
}

const README = `Musas Sonideras — data export for Gephi / R (igraph)
======================================================

collaborators.csv — one row per collaborator. Use as the NODES table in Gephi
  Id, Label, InstagramHandle, Description, Tags, FirstSeenDate, IsCentral, PostCount
  - Id: matches Source/Target in connections.csv
  - Tags: semicolon-separated

connections.csv — one row per connection. Use as the EDGES table in Gephi
  Source, Target, Type, ConnectionType, Label, Weight, FirstDate, LastDate, Note
  - Type: always "Undirected" (Gephi's edge-direction column)
  - ConnectionType: "co-tagged" (derived from posts) or "manual" (drawn by hand)
  - Weight: number of shared posts for co-tagged edges, 1 for manual edges
  - FirstDate / LastDate: date range of the posts behind a co-tagged edge (blank for manual)

posts.csv — one row per record (a screenshot, a named occasion, or both at once)
  Id, Name, PostDate, EndDate, PostUrl, CaptionNotes, Interpretation, CollaboratorNames, Roles, PlaceName, Tags, Themes
  - Name: only set for a named occasion, blank for an ordinary screenshot
  - Roles: "Name:Role" pairs, semicolon-separated, only for collaborators with a role noted
  - Themes: the record's thematic-analysis codes, a separate vocabulary from Tags

places.csv — one row per place
  Id, Name, Address, Lat, Lng, Types, Notes

To import into Gephi: Data Laboratory -> Import Spreadsheet -> collaborators.csv as Nodes
table, then connections.csv as Edges table.

To import into R: read.csv() each file, then build a graph with
igraph::graph_from_data_frame(edges, vertices = nodes).
`;

export async function exportCsvBundle(): Promise<void> {
  const [collaborators, connections, posts, places, tags, themes] = await Promise.all([
    getAllCollaborators(),
    getAllConnections(),
    getAllPosts(),
    getAllPlaces(),
    getAllTags(),
    getAllThemes(),
  ]);

  const tagById = new Map(tags.map((t) => [t.id, t]));
  const themeById = new Map(themes.map((t) => [t.id, t]));
  const themeLabels = (ids: string[]) => ids.map((id) => themeById.get(id)?.label).filter(Boolean).join(';');
  const collaboratorById = new Map(collaborators.map((c) => [c.id, c]));
  const placeById = new Map(places.map((p) => [p.id, p]));

  const tagLabels = (ids: string[]) => ids.map((id) => tagById.get(id)?.label).filter(Boolean).join(';');
  const collaboratorNames = (ids: string[]) => ids.map((id) => collaboratorById.get(id)?.name).filter(Boolean).join(';');

  const postCountByCollaborator = new Map<string, number>();
  for (const post of posts) {
    for (const cid of post.collaboratorIds) postCountByCollaborator.set(cid, (postCountByCollaborator.get(cid) ?? 0) + 1);
  }

  const collaboratorsCsv = toCSV(
    ['Id', 'Label', 'InstagramHandle', 'Description', 'Tags', 'FirstSeenDate', 'IsCentral', 'PostCount'],
    collaborators.map((c: Collaborator) => [
      c.id,
      c.name,
      c.instagramHandle ?? '',
      stripHtml(c.description),
      tagLabels(c.tagIds),
      c.firstSeenDate ?? '',
      Boolean(c.isCentral),
      postCountByCollaborator.get(c.id) ?? 0,
    ]),
  );

  const postDatesCache = new Map<string, string[]>();
  function datesForConnection(conn: Connection): string[] {
    if (conn.type !== 'co-tagged') return [];
    if (postDatesCache.has(conn.id)) return postDatesCache.get(conn.id)!;
    const postById = new Map(posts.map((p) => [p.id, p]));
    const dates = conn.postIds.map((pid) => postById.get(pid)?.postDate).filter((d): d is string => Boolean(d)).sort();
    postDatesCache.set(conn.id, dates);
    return dates;
  }

  const connectionsCsv = toCSV(
    ['Source', 'Target', 'Type', 'ConnectionType', 'Label', 'Weight', 'FirstDate', 'LastDate', 'Note'],
    connections.map((conn: Connection) => {
      const dates = datesForConnection(conn);
      return [
        conn.collaboratorAId,
        conn.collaboratorBId,
        'Undirected',
        conn.type,
        conn.label ?? '',
        conn.type === 'co-tagged' ? conn.postIds.length : 1,
        dates[0] ?? '',
        dates[dates.length - 1] ?? '',
        conn.note ?? '',
      ];
    }),
  );

  const collaboratorRoles = (p: Post) =>
    p.collaboratorIds
      .map((cid) => {
        const role = p.collaboratorRoles?.[cid];
        const name = collaboratorById.get(cid)?.name;
        return role && name ? `${name}:${role}` : null;
      })
      .filter((s): s is string => Boolean(s))
      .join(';');

  const postsCsv = toCSV(
    ['Id', 'Name', 'PostDate', 'EndDate', 'PostUrl', 'CaptionNotes', 'Interpretation', 'CollaboratorNames', 'Roles', 'PlaceName', 'Tags', 'Themes'],
    posts.map((p: Post) => [
      p.id,
      p.name ?? '',
      p.postDate,
      p.endDate ?? '',
      p.postUrl ?? '',
      stripHtml(p.captionNotes),
      stripHtml(p.interpretation),
      collaboratorNames(p.collaboratorIds),
      collaboratorRoles(p),
      p.placeId ? placeById.get(p.placeId)?.name ?? '' : '',
      tagLabels(p.tagIds),
      themeLabels(p.themeIds ?? []),
    ]),
  );

  const placesCsv = toCSV(
    ['Id', 'Name', 'Address', 'Lat', 'Lng', 'Types', 'Notes'],
    places.map((p: Place) => [p.id, p.name, p.address ?? '', p.lat, p.lng, tagLabels(p.placeTypeTagIds), stripHtml(p.notes)]),
  );

  const zip = new JSZip();
  zip.file('README.txt', README);
  zip.file('collaborators.csv', collaboratorsCsv);
  zip.file('connections.csv', connectionsCsv);
  zip.file('posts.csv', postsCsv);
  zip.file('places.csv', placesCsv);

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  downloadBlob(blob, `musas-sonideras-csv-export-${new Date().toISOString().slice(0, 10)}.zip`);
}
