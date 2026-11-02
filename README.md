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

## What's built so far (Stage 1)

- Project setup, with the sonidero-inspired visual theme (light & dark mode).
- The full data model: Collaborators, Posts, Events, Places, Connections, Tags.
- Local storage in IndexedDB, including screenshot images.
- Backup export/import as a single .zip file.
- A small set of demo data (clearly marked `[DEMO]`) you can load to try
  things out, and remove with one click.

The Home screen right now is mostly a dashboard for testing this foundation —
record counts, demo data, and backup. The Inbox, Collaborators, Network, Map,
Gallery and Field Notes screens are stubbed in the navigation and will be
built in the next stages.

## Project structure (for reference)

```
src/
  types/models.ts      TypeScript definitions for every record type
  db/schema.ts          IndexedDB store/index definitions
  db/db.ts               database connection helpers
  db/repos.ts            CRUD functions for every record type, including the
                          logic that auto-derives "co-tagged" connections
                          from posts
  db/backup.ts            export/import as .zip
  demoData.ts              the fake demo dataset
  pages/                    one file per screen
  styles/theme.css           the visual theme (colors, light/dark mode)
```
