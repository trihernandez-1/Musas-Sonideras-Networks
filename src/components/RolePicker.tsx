import { useMemo, useRef, useState } from 'react';
import { normalizeForSearch } from '../db/repos';

/** A free-text field that also offers a dropdown of previously-used role strings — picking
 * one just fills the text in, so it's still plain free text underneath (no separate role
 * entity), but reusing an exact spelling is one click instead of retyping it. */
export default function RolePicker({
  value,
  onChange,
  knownRoles,
  placeholder = 'Role, e.g. DJ, Venue, Designer…',
}: {
  value: string;
  onChange: (value: string) => void;
  knownRoles: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = normalizeForSearch(value.trim());
    const pool = knownRoles.filter((r) => normalizeForSearch(r) !== q);
    if (!q) return pool.slice(0, 8);
    return pool.filter((r) => normalizeForSearch(r).includes(q)).slice(0, 8);
  }, [knownRoles, value]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        style={inputStyle}
      />
      {open && matches.length > 0 && (
        <div className="card" style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 4px)', left: 0, right: 0, padding: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
          {matches.map((role) => (
            <div
              key={role}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(role);
                setOpen(false);
                inputRef.current?.blur();
              }}
              style={{ padding: '0.35rem 0.5rem', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {role}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '0.35rem 0.6rem',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
};
