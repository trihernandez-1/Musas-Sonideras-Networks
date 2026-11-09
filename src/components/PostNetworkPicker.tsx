import { useMemo, useRef, useState } from 'react';
import type { Post } from '../types/models';
import { normalizeForSearch } from '../db/repos';

function postLabel(p: Post): string {
  return p.name || p.captionNotes.slice(0, 40) || p.postDate;
}

/** Search-to-select a single post, read-only (no creation) — used to pick which record's
 * participants to view in the by-post Network mode. */
export default function PostNetworkPicker({
  posts,
  selectedId,
  onChange,
}: {
  posts: Post[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = posts.find((p) => p.id === selectedId);

  const matches = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    const pool = [...posts].sort((a, b) => b.postDate.localeCompare(a.postDate));
    if (!q) return pool.slice(0, 8);
    return pool.filter((p) => normalizeForSearch(postLabel(p)).includes(q) || normalizeForSearch(p.postDate).includes(q)).slice(0, 8);
  }, [posts, query]);

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
          {postLabel(selected)} ({selected.postDate})
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
        placeholder="Search a post by name, caption, or date…"
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
          {matches.map((p) => (
            <div
              key={p.id}
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => {
                onChange(p.id);
                setQuery('');
              }}
              style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}
              onMouseEnter={(ev) => (ev.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={(ev) => (ev.currentTarget.style.background = 'transparent')}
            >
              {postLabel(p)} <span style={{ color: 'var(--color-text-muted)' }}>({p.postDate})</span>
            </div>
          ))}
        </div>
      )}
      {open && matches.length === 0 && (
        <div className="card" style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 4px)', left: 0, right: 0, padding: '0.6rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          No posts yet.
        </div>
      )}
    </div>
  );
}
