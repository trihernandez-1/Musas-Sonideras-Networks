import { useMemo, useRef, useState } from 'react';
import { normalizeForSearch } from '../db/repos';

export interface EntityOption {
  id: string;
  label: string;
  sublabel?: string;
}

/** A search-to-select multi-picker for linking existing records (posts, events, places) —
 * unlike TagMultiSelect/CollaboratorMultiSelect, it never creates new ones. */
export default function EntityMultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder = 'Type to search…',
}: {
  options: EntityOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = selectedIds.map((id) => options.find((o) => o.id === id)).filter((o): o is EntityOption => Boolean(o));

  const matches = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    const pool = options.filter((o) => !selectedIds.includes(o.id));
    if (!q) return pool.slice(0, 8);
    return pool.filter((o) => normalizeForSearch(o.label).includes(q) || normalizeForSearch(o.sublabel ?? '').includes(q)).slice(0, 8);
  }, [options, query, selectedIds]);

  function add(id: string) {
    onChange([...selectedIds, id]);
    setQuery('');
    inputRef.current?.focus();
  }
  function remove(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.5rem', background: 'var(--color-surface)' }}>
        {selected.map((o) => (
          <span key={o.id} className="chip" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
            {o.label}
            <button type="button" onClick={() => remove(o.id)} aria-label={`Remove ${o.label}`} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 600, padding: 0, lineHeight: 1 }}>
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
          placeholder={placeholder}
          style={{ flex: 1, minWidth: '140px', border: 'none', outline: 'none', background: 'transparent', color: 'var(--color-text)' }}
        />
      </div>
      {open && matches.length > 0 && (
        <div className="card" style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 4px)', left: 0, right: 0, padding: '0.4rem', maxHeight: '220px', overflowY: 'auto' }}>
          {matches.map((o) => (
            <div
              key={o.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(o.id)}
              style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span>{o.label}</span>
              {o.sublabel && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{o.sublabel}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
