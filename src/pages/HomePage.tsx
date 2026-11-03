import { useCallback, useEffect, useRef, useState } from 'react';
import { exportBackup, importBackup } from '../db/backup';
import { deleteDemoData, hasDemoData, loadDemoData } from '../demoData';
import { getDB } from '../db/db';
import { exportCsvBundle } from '../utils/exportCsv';
import { exportGeoJson } from '../utils/exportGeoJson';

interface Counts {
  collaborators: number;
  posts: number;
  places: number;
  events: number;
  connections: number;
  tags: number;
  fieldNotes: number;
  images: number;
}

async function loadCounts(): Promise<Counts> {
  const db = await getDB();
  const [collaborators, posts, places, events, connections, tags, fieldNotes, images] =
    await Promise.all([
      db.count('collaborators'),
      db.count('posts'),
      db.count('places'),
      db.count('events'),
      db.count('connections'),
      db.count('tags'),
      db.count('fieldNotes'),
      db.count('images'),
    ]);
  return { collaborators, posts, places, events, connections, tags, fieldNotes, images };
}

export default function HomePage() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setCounts(await loadCounts());
    setDemoLoaded(hasDemoData());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleLoadDemo() {
    setBusy(true);
    try {
      await loadDemoData();
      await refresh();
      setMessage('Demo data loaded. Look around, then delete it any time with the button below.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteDemo() {
    if (!confirm('Delete all demo data? This only removes the fake records, not your own work.')) return;
    setBusy(true);
    try {
      await deleteDemoData();
      await refresh();
      setMessage('Demo data deleted.');
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setBusy(true);
    try {
      await exportBackup();
      setMessage('Backup downloaded as a .zip file.');
    } finally {
      setBusy(false);
    }
  }

  async function handleExportCsv() {
    setBusy(true);
    try {
      await exportCsvBundle();
      setMessage('CSVs downloaded — ready to import into Gephi or R.');
    } finally {
      setBusy(false);
    }
  }

  async function handleExportGeoJson() {
    setBusy(true);
    try {
      await exportGeoJson();
      setMessage('GeoJSON downloaded — ready to open in QGIS.');
    } finally {
      setBusy(false);
    }
  }

  async function handleImportFile(file: File) {
    const warning =
      'Importing a backup REPLACES everything currently in the app with the contents of that file. ' +
      'Make sure you have a current backup of what is here now if you want to keep it. Continue?';
    if (!confirm(warning)) return;
    setBusy(true);
    try {
      const summary = await importBackup(file);
      await refresh();
      setMessage(
        `Import complete. Restored a backup from ${new Date(summary.exportedAt).toLocaleString()}.`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <section className="card">
        <h1>Musas Sonideras — Research Notebook</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          A personal, offline notebook for your digital ethnography. Everything you enter is
          stored only in this browser, on this device, in IndexedDB — nothing is uploaded
          anywhere. Use the backup export regularly, especially before switching devices or
          clearing browser data.
        </p>
      </section>

      {message && (
        <div className="card" style={{ borderColor: 'var(--color-accent)' }}>
          {message}
        </div>
      )}

      <section className="card">
        <h2>Project at a glance</h2>
        {counts ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <CountTile label="Collaborators" value={counts.collaborators} />
            <CountTile label="Posts" value={counts.posts} />
            <CountTile label="Events" value={counts.events} />
            <CountTile label="Places" value={counts.places} />
            <CountTile label="Connections" value={counts.connections} />
            <CountTile label="Tags" value={counts.tags} />
            <CountTile label="Field notes" value={counts.fieldNotes} />
            <CountTile label="Images stored" value={counts.images} />
          </div>
        ) : (
          <p>Loading…</p>
        )}
      </section>

      <section className="card">
        <h2>Demo data</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          A small set of clearly fake collaborators, a post, an event and a place, so you can try
          out every screen before entering real material. Everything is labeled{' '}
          <strong>[DEMO]</strong> and can be removed in one click, leaving your own data untouched.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn" onClick={handleLoadDemo} disabled={busy || demoLoaded}>
            {demoLoaded ? 'Demo data is loaded' : 'Load demo data'}
          </button>
          <button className="btn danger" onClick={handleDeleteDemo} disabled={busy || !demoLoaded}>
            Delete demo data
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Backup &amp; restore</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Export your whole project — all records and screenshots — as a single .zip file you can
          keep in cloud storage or move to another device. Importing a backup replaces everything
          currently in the app.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn" onClick={handleExport} disabled={busy}>
            Export backup (.zip)
          </button>
          <button className="btn secondary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
            Import backup (.zip)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </section>

      <section className="card">
        <h2>Data exports</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          For analysis outside the app. CSVs are shaped as a nodes/edges table pair, ready to
          import straight into Gephi or load in R with <code>igraph</code>. The GeoJSON file
          opens directly in QGIS. (The network graph itself exports as PNG/SVG from the Network
          page, and the map prints to PDF from the Map page.)
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn secondary" onClick={handleExportCsv} disabled={busy}>
            Export CSVs (Gephi / R)
          </button>
          <button className="btn secondary" onClick={handleExportGeoJson} disabled={busy}>
            Export GeoJSON (QGIS)
          </button>
        </div>
      </section>
    </div>
  );
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '0.75rem',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
  );
}
