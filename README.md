# Musas Sonideras — Research Notebook

A personal, offline research app for documenting the Musas Sonideras Instagram
network: collaborators, posts, events, places, and the connections between them.
Everything is entered by hand and stored only in your browser (IndexedDB) —
there is no server, no login, and no Instagram API involved.

## Running it on your laptop (first time)

You need [Node.js](https://nodejs.org) installed (the current "LTS" version is fine).
To check if you already have it, open Terminal and type:

```bash
node --version
```

If that prints a version number (like `v20.x.x`), you're set. If not, install
Node.js from nodejs.org first.

Then, in Terminal:

```bash
cd musas-sonideras
npm install
```

This downloads the small number of libraries the app uses. It only needs to be
done once (or again after you pull new code changes).

## Running it every time after that

```bash
cd musas-sonideras
npm run dev
```

This starts a local server and prints a web address, something like
`http://localhost:5173/`. Open that address in your browser (Chrome, Safari,
or Firefox all work). Leave the Terminal window open while you work — closing
it stops the app. Press `Ctrl+C` in the Terminal when you're done.

## Using it on your iPhone

The app also works in Safari on your iPhone, but your iPhone needs to reach
the same server your laptop is running. The simplest way:

1. Make sure your iPhone and laptop are on the same Wi-Fi network.
2. Run `npm run dev -- --host` instead of `npm run dev`. It will print a
   second address like `http://192.168.1.23:5173/`.
3. Open that second address in Safari on your iPhone.

Note that data you enter on your iPhone and data you enter on your laptop are
stored separately (each browser has its own IndexedDB). Use the **Export
backup** button on one device and **Import backup** on the other to move your
work between them, or just pick one device as your "main" one and treat the
other as a quick way to browse.

## Your data and backups

Everything you enter — collaborators, posts, screenshots, events, places,
notes — is stored locally in your browser. This is convenient (no account,
no server, no privacy risk) but also means:

- Clearing your browser's site data, using private/incognito mode, or
  switching browsers will make your data inaccessible (though not instantly
  deleted in most cases — don't rely on this).
- **Back up often.** On the Home screen, click **Export backup (.zip)**. This
  downloads a single file with everything in it, including your screenshots.
  Keep these backups somewhere safe (cloud storage, an external drive).
- To restore a backup, or move your project to a new computer, click
  **Import backup (.zip)** and choose a previously exported file. This
  *replaces* everything currently in the app, so only do this when you mean
  to.

## What's built

- **Home** — project dashboard: record counts, demo data, backup export/import,
  and data exports (CSV for Gephi/R, GeoJSON for QGIS).
- **Inbox** — fast post entry: drop/paste screenshots, tag collaborators (search
  or quick-create), link or create an event, caption notes, a rich-text
  interpretation field, and your own tags.
- **Collaborators** — searchable card grid with tag filtering; each profile
  shows description, tags, every post/event they appear in, their connections,
  a small map, and prints to a clean profile sheet.
- **Network** — a force-directed graph (collaborators as nodes, sized by post
  count): solid lines for co-tagged connections, dashed for ones you draw by
  hand (drag from node to node); filter by tag, color by a chosen tag, and a
  date-range slider marking October 6, 2023 (the heritage declaration) to
  compare before/after. Exports as SVG or PNG.
- **Map** — events as clustered pins; add a place by clicking the map or
  searching an address (OpenStreetMap Nominatim); the same tag/date filters;
  an optional overlay of lines between places that share a collaborator;
  prints to PDF.
- **Gallery** — every post and event as a wall of screenshots in date order,
  your interpretation underneath each one, filterable by tag, collaborator, or
  place.
- **Field Notes** — free-form notes you can link to any collaborator, post,
  event, or place.
- **Event pages** (`/events/:id`) — a full profile for each event, reached from
  the Gallery or Map, which also prints to a clean profile sheet.

Everything is stored locally in IndexedDB — screenshots included — with a demo
dataset (clearly marked `[DEMO]`) you can load and remove at any time.

## A note on exporting the map as an image

"Export map" on the Map screen opens your browser's print dialog showing just
the map — choose "Save as PDF" there, or screenshot the preview. A direct
one-click PNG download isn't reliable for the map specifically: OpenStreetMap's
tile server doesn't allow browsers to read the map imagery back out for
export, which is a restriction of their server, not this app. The Network
graph doesn't have this problem (it's not built from a tile server) and
exports directly as PNG or SVG.

## Project structure (for reference)

```
src/
  types/models.ts      TypeScript definitions for every record type
  db/schema.ts          IndexedDB store/index definitions
  db/db.ts               database connection helpers
  db/repos.ts            CRUD functions for every record type, including the
                          logic that auto-derives "co-tagged" connections
                          from posts, and event <-> post links
  db/backup.ts            export/import as .zip
  demoData.ts              the fake demo dataset
  pages/                    one file per screen
  components/                shared UI: pickers, the network graph, the map
                              marker clustering, rich text editor, etc.
  utils/exportCsv.ts           Gephi/R CSV export
  utils/exportGeoJson.ts        QGIS GeoJSON export
  utils/exportSvg.ts             network PNG/SVG export
  styles/theme.css                 the visual theme (colors, light/dark mode,
                                    print styles)
```
