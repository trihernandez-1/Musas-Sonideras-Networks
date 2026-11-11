import { useMemo, useRef, useState } from 'react';
import type { Collaborator } from '../types/models';
import { normalizeForSearch } from '../db/repos';

export default function CollaboratorMultiSelect({
  allCollaborators,
  selectedIds,
  onChange,
  onCreateCollaborator,
  placeholder = 'Type a name or @handle…',
}: {
  allCollaborators: Collaborator[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreateCollaborator: (handle: string) => Promise<Collaborator>;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = selectedIds
    .map((id) => allCollaborators.find((c) => c.id === id))
    .filter((c): c is Collaborator => Boolean(c));

  const matches = useMemo(() => {
    const q = normalizeForSearch(query.trim().replace(/^@/, ''));
    const pool = allCollaborators.filter((c) => !selectedIds.includes(c.id));
    if (!q) return pool.slice(0, 8);
    return pool
      .filter(
        (c) =>
          normalizeForSearch(c.name).includes(q) ||
          normalizeForSearch(c.instagramHandle ?? '').includes(q),
      )
      .slice(0, 8);
  }, [allCollaborators, query, selectedIds]);

  const cleanedQuery = query.trim().replace(/^@/, '');
  const exactMatchExists = allCollaborators.some(
    (c) =>
      normalizeForSearch(c.instagramHandle ?? '') === normalizeForSearch(cleanedQuery) ||
      normalizeForSearch(c.name) === normalizeForSearch(cleanedQuery),
  );

  function addCollaborator(id: string) {
    onChange([...selectedIds, id]);
    setQuery('');
    inputRef.current?.focus();
  }

  function removeCollaborator(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  async function handleCreate() {
    if (!cleanedQuery) return;
    const collaborator = await onCreateCollaborator(cleanedQuery);
    addCollaborator(collaborator.id);
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.4rem',
          alignItems: 'center',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.4rem 0.5rem',
          background: 'var(--color-surface)',
        }}
      >
        {selected.map((c) => (
          <span
            key={c.id}
            className="chip"
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
          >
            {c.name}
            <button
              type="button"
              onClick={() => removeCollaborator(c.id)}
              aria-label={`Remove ${c.name}`}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontWeight: 600,
                padding: 0,
                lineHeight: 1,
                opacity: 0.85,
              }}
            >
              ×
            </button>
          </span>
        ))}
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
              if (matches.length > 0) addCollaborator(matches[0].id);
              else if (!exactMatchExists && cleanedQuery) handleCreate();
            } else if (e.key === 'Backspace' && query === '' && selected.length > 0) {
              removeCollaborator(selected[selected.length - 1].id);
            }
          }}
          placeholder={placeholder}
          style={{
            flex: 1,
            minWidth: '160px',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--color-text)',
          }}
        />
      </div>
      {open && (matches.length > 0 || cleanedQuery) && (
        <div
          className="card"
          style={{
            position: 'absolute',
            zIndex: 20,
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            padding: '0.4rem',
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          {matches.map((c) => (
            <div
              key={c.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addCollaborator(c.id)}
              style={{
                padding: '0.4rem 0.5rem',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span>{c.name}</span>
              {c.instagramHandle && (
                <span style={{ color: 'var(--color-text-muted)' }}>@{c.instagramHandle}</span>
              )}
            </div>
          ))}
          {cleanedQuery && !exactMatchExists && (
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
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              + Create collaborator "@{cleanedQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
