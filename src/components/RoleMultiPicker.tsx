import { useMemo, useRef, useState } from 'react';
import { normalizeForSearch } from '../db/repos';

/** One collaborator's roles on a single post — a person can be more than one thing here (a DJ
 * who also designed the flyer), so this is a small chip list rather than a single text field:
 * type to search previously-used roles or create a new one, same idiom as TagMultiSelect, but
 * for plain free-text roles rather than id-referenced tags. The first chip added is treated as
 * this person's most prominent role on this post wherever only one can be shown (e.g. node
 * color), so order matters a little — reordering isn't supported, just add/remove. */
export default function RoleMultiPicker({
  values,
  onChange,
  knownRoles,
  placeholder = 'Add a role, e.g. DJ, Venue, Designer…',
}: {
  values: string[];
  onChange: (values: string[]) => void;
  knownRoles: string[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    const pool = knownRoles.filter((r) => !values.some((v) => normalizeForSearch(v) === normalizeForSearch(r)));
    if (!q) return pool.slice(0, 8);
    return pool.filter((r) => normalizeForSearch(r).includes(q)).slice(0, 8);
  }, [knownRoles, query, values]);

  const exactMatchExists = values.some((v) => normalizeForSearch(v) === normalizeForSearch(query.trim()));

  function addRole(role: string) {
    const trimmed = role.trim();
    if (!trimmed || exactMatchExists) return;
    onChange([...values, trimmed]);
    setQuery('');
    inputRef.current?.focus();
  }

  function removeRole(role: string) {
    onChange(values.filter((v) => v !== role));
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.35rem',
          alignItems: 'center',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.3rem 0.5rem',
          background: 'var(--color-surface)',
        }}
      >
        {values.map((role, i) => (
          <span
            key={role}
            className="chip"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3em', fontSize: '0.82rem' }}
            title={i === 0 ? 'Primary role' : undefined}
          >
            {role}
            <button
              type="button"
              onClick={() => removeRole(role)}
              aria-label={`Remove role ${role}`}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: 'inherit', opacity: 0.7 }}
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
              if (matches.length > 0) addRole(matches[0]);
              else if (query.trim()) addRole(query);
            } else if (e.key === 'Backspace' && query === '' && values.length > 0) {
              removeRole(values[values.length - 1]);
            }
          }}
          placeholder={values.length === 0 ? placeholder : 'Add another…'}
          style={{
            flex: 1,
            minWidth: '120px',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--color-text)',
            fontSize: '0.85rem',
            padding: '0.15rem 0',
          }}
        />
      </div>
      {open && (matches.length > 0 || (query.trim() && !exactMatchExists)) && (
        <div
          className="card"
          style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 4px)', left: 0, right: 0, padding: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}
        >
          {matches.map((role) => (
            <div
              key={role}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addRole(role)}
              style={{ padding: '0.35rem 0.5rem', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {role}
            </div>
          ))}
          {query.trim() && !exactMatchExists && !matches.some((r) => normalizeForSearch(r) === normalizeForSearch(query.trim())) && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addRole(query)}
              style={{
                padding: '0.35rem 0.5rem',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-accent-2)',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              + Add "{query.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
