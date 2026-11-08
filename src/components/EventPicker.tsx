import { useMemo, useRef, useState } from 'react';
import type { EventRecord } from '../types/models';
import { normalizeForSearch } from '../db/repos';

/** Single-select search/create picker for linking a post to an event. */
export default function EventPicker({
  allEvents,
  selectedId,
  onChange,
  onCreateEvent,
}: {
  allEvents: EventRecord[];
  selectedId?: string;
  onChange: (id: string | undefined) => void;
  onCreateEvent: (name: string) => Promise<EventRecord>;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = allEvents.find((e) => e.id === selectedId);

  const matches = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    if (!q) return allEvents.slice(0, 8);
    return allEvents.filter((e) => normalizeForSearch(e.name).includes(q)).slice(0, 8);
  }, [allEvents, query]);

  const exactMatchExists = allEvents.some(
    (e) => normalizeForSearch(e.name) === normalizeForSearch(query.trim()),
  );

  async function handleCreate() {
    const ev = await onCreateEvent(query.trim());
    onChange(ev.id);
    setQuery('');
  }

  if (selected) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem 0.75rem',
          background: 'var(--color-surface)',
        }}
      >
        <span>
          {selected.name} <span style={{ color: 'var(--color-text-muted)' }}>({selected.startDate})</span>
        </span>
        <button className="btn ghost" style={{ padding: '0.15em 0.6em' }} onClick={() => onChange(undefined)}>
          Unlink
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (matches.length > 0) {
              onChange(matches[0].id);
              setQuery('');
            } else if (!exactMatchExists && query.trim()) {
              handleCreate();
            }
          }
        }}
        placeholder="No linked event — type to search or create one…"
        style={{
          width: '100%',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem 0.75rem',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
        }}
      />
      {open && (matches.length > 0 || query.trim()) && (
        <div
          className="card"
          style={{
            position: 'absolute',
            zIndex: 20,
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            padding: '0.4rem',
            maxHeight: '220px',
            overflowY: 'auto',
          }}
        >
          {matches.map((ev) => (
            <div
              key={ev.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(ev.id);
                setQuery('');
              }}
              style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {ev.name} <span style={{ color: 'var(--color-text-muted)' }}>({ev.startDate})</span>
            </div>
          ))}
          {query.trim() && !exactMatchExists && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreate}
              style={{
                padding: '0.4rem 0.5rem',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-accent-2)',
                fontWeight: 600,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              + Create event "{query.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
