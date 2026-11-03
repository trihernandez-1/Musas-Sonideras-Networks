import { useMemo, useRef, useState } from 'react';
import type { EventRecord } from '../types/models';
import { normalizeForSearch } from '../db/repos';

/** Search-to-select a single event, read-only (no creation) — used to pick which event's
 * participants to view in the by-event Network mode. */
export default function EventNetworkPicker({
  events,
  selectedId,
  onChange,
}: {
  events: EventRecord[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = events.find((e) => e.id === selectedId);

  const matches = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    const pool = [...events].sort((a, b) => b.startDate.localeCompare(a.startDate));
    if (!q) return pool.slice(0, 8);
    return pool.filter((e) => normalizeForSearch(e.name).includes(q) || normalizeForSearch(e.startDate).includes(q)).slice(0, 8);
  }, [events, query]);

  if (selected) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.45rem 0.6rem',
          background: 'var(--color-surface)',
          maxWidth: '340px',
        }}
      >
        <span style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected.name} ({selected.startDate})
        </span>
        <button type="button" className="btn ghost" style={{ padding: '0.1em 0.5em', flexShrink: 0, marginLeft: '0.5rem' }} onClick={() => onChange(null)}>
          Change
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', maxWidth: '340px' }}>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search an event by name or date…"
        style={{
          width: '100%',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.45rem 0.6rem',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
        }}
      />
      {open && matches.length > 0 && (
        <div className="card" style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 4px)', left: 0, right: 0, padding: '0.4rem', maxHeight: '240px', overflowY: 'auto' }}>
          {matches.map((e) => (
            <div
              key={e.id}
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => {
                onChange(e.id);
                setQuery('');
              }}
              style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}
              onMouseEnter={(ev) => (ev.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={(ev) => (ev.currentTarget.style.background = 'transparent')}
            >
              {e.name} <span style={{ color: 'var(--color-text-muted)' }}>({e.startDate})</span>
            </div>
          ))}
        </div>
      )}
      {open && matches.length === 0 && (
        <div className="card" style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 4px)', left: 0, right: 0, padding: '0.6rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          No events yet.
        </div>
      )}
    </div>
  );
}
