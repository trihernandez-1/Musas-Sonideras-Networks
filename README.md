# Musas Sonideras — Research Notebook

A personal, offline research app for documenting the Musas Sonideras Instagram
network: collaborators, posts, places, and the connections between them.
Everything is entered by hand and stored only in your browser (IndexedDB) —
there is no server, no login, and no Instagram API involved.

**Live version:** https://trihernandez-1.github.io/Musas-Sonideras-Networks/
— this is the same app, hosted as a static site (it runs entirely in your
browser, so no server ever sees your data). Because the repo is public,
anyone with the link can open it, but they only ever see a blank, empty
notebook: nothing you enter is stored in the repo or visible to anyone else.
Your data lives only in *your own browser's* storage on whichever device you
used — the laptop version and this hosted version are two separate browser
origins with two separate, unconnected stores, same as any two browsers.
Move data between them with **Export backup** / **Import backup**, same as
moving between any two browsers or devices.

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

Everything you enter — collaborators, posts, screenshots, places,
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

There is one kind of record — a **post** — and it covers everything from a
quick screenshot to a named, multi-day gathering with its own roster of who
did what. Nothing forces you to pick between "a post" and "an event": fill in
whichever fields apply to what you're logging. A screenshot with no name is
just a post; a named occasion with no screenshot is just as valid a post; a
screenshot *of* a named occasion is a third post, on its own.

- **Home** — project dashboard: record counts, demo data, backup export/import,
  and data exports (CSV for Gephi/R, GeoJSON for QGIS).
- **Inbox** — one form, every field optional except the date: drop/paste
  screenshots, give it a name if it's a named occasion, an end date for
  something multi-day, tag collaborators (search or quick-create) and note
  what each one did ("Who did what" — a person can have more than one role
  on the same post; type one or pick from previously-used roles, the first
  one added counts as their main role), set a location (search an address or
  add one by hand — it shows up as its own pin on the Map), a post link,
  caption notes, a rich-text interpretation field, your own tags, and
  themes — a separate vocabulary of thematic-analysis codes, so tags and
  analytical codes don't get mixed together.
- **Collaborators** — searchable card grid with tag filtering; each profile
  shows description, tags, every post they appear in, their connections, a
  small map, and prints to a clean profile sheet.
- **Network** — three modes, switchable at the top:
  - **Aggregate**: a force-directed graph (collaborators as nodes, sized by
    post count): solid lines for co-tagged connections, dashed for ones you
    draw by hand (drag from node to node); filter by tag, color by a chosen
    tag or by role (each person's most common role across posts in range —
    guaranteed a different color per role, with a legend overlaid on the
    graph; hover a node for their name, role(s), and post count), pick a
    single post to spotlight exactly who was tagged together in it, and a
    date-range slider marking October 6, 2023 (the heritage declaration) to
    compare before/after.
  - **By post**: pick one post to see just its participants in a simple hub
    diagram, colored by each person's main role (set roles from the post's
    own page, under "Who did what").
  - **Analysis**: standard network-science measures (degree, density,
    connected components, diameter, average path length, clustering
    coefficient — following Barabási's *Network Science*, Ch. 2), computed
    on a graph where two collaborators are linked if they appear together in
    at least one post. Run it over every post or a chosen set of them, with
    plain-language explanations of each measure and a CSV export of the
    per-person numbers.
  Aggregate and By post both export as SVG or PNG.
- **Map** — three view modes, switchable at the top:
  - **Locations**: one pin per place (clustered when zoomed out), however
    many posts it holds; every place records a venue type and notes,
    wherever it's added from (the map itself or a post's location); clicking
    a pin — or a place in the sidebar list — shows that description first,
    with every post held there listed underneath (thumbnail if it has a
    screenshot, a chip if not), before you ever reach the edit form.
  - **Density**: a proportional-symbol bubble per place, sized by area (not
    raw radius) and numbered, so a venue used ten times doesn't just look
    "a bit bigger" than one used once — it's visually unmistakable.
  - **Heatmap**: a density glow weighted by the same per-place counts, for a
    more at-a-glance read of where activity concentrates.
  Add a place by clicking the map or searching an address (OpenStreetMap
  Nominatim); the same tag/date filters apply in every mode, and the
  sidebar's place list is sorted busiest-first with its own count; an
  optional overlay of lines between places that share a collaborator;
  prints to PDF.
- **Gallery** — every post as a wall, newest first, your interpretation
  underneath each one, filterable by tag, theme, collaborator, or place.
  Each card has a delete button, which also cleans up any tags, themes, or
  placeholder collaborators that were only ever used by that one post.
- **Post pages** (`/posts/:id`) — a full profile for any post, reached from
  the Gallery, Map, or a collaborator's profile: every screenshot, full
  fields, edit and delete, and prints to a clean sheet.
- **Field Notes** — free-form notes you can link to any collaborator, post,
  or place.

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
  db/db.ts               database connection helpers, including the migration
                          that folds any pre-merge "event" store into posts
  db/legacyMigration.ts   the shared old-event -> post conversion, used by
                          both the live database migration and backup import
  db/repos.ts            CRUD functions for every record type, including the
                          logic that auto-derives "co-tagged" connections
                          from posts
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
