import { useMemo, useRef, useState } from 'react';
import type { Tag } from '../types/models';
import { normalizeForSearch } from '../db/repos';
import TagChip from './TagChip';

export default function TagMultiSelect({
  allTags,
  selectedIds,
  onChange,
  onCreateTag,
  placeholder = 'Type to search or create a tag…',
}: {
  allTags: Tag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreateTag: (label: string) => Promise<Tag>;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = selectedIds
    .map((id) => allTags.find((t) => t.id === id))
    .filter((t): t is Tag => Boolean(t));

  const matches = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    if (!q) return allTags.filter((t) => !selectedIds.includes(t.id)).slice(0, 8);
    return allTags
      .filter((t) => !selectedIds.includes(t.id) && normalizeForSearch(t.label).includes(q))
      .slice(0, 8);
  }, [allTags, query, selectedIds]);

  const exactMatchExists = allTags.some(
    (t) => normalizeForSearch(t.label) === normalizeForSearch(query.trim()),
  );

  function addTag(id: string) {
    onChange([...selectedIds, id]);
    setQuery('');
    inputRef.current?.focus();
  }

  function removeTag(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  async function handleCreate() {
    const label = query.trim();
    if (!label) return;
    const tag = await onCreateTag(label);
    addTag(tag.id);
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
        {selected.map((tag) => (
          <TagChip key={tag.id} tag={tag} onRemove={() => removeTag(tag.id)} size="sm" />
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
              if (matches.length > 0) addTag(matches[0].id);
              else if (!exactMatchExists && query.trim()) handleCreate();
            } else if (e.key === 'Backspace' && query === '' && selected.length > 0) {
              removeTag(selected[selected.length - 1].id);
            }
          }}
          placeholder={placeholder}
          style={{
            flex: 1,
            minWidth: '140px',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--color-text)',
          }}
        />
      </div>
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
          {matches.map((tag) => (
            <div
              key={tag.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(tag.id)}
              style={{ padding: '0.35rem 0.5rem', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <TagChip tag={tag} size="sm" />
            </div>
          ))}
          {query.trim() && !exactMatchExists && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreate}
              style={{
                padding: '0.35rem 0.5rem',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-accent-2)',
                fontWeight: 600,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              + Create tag "{query.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
