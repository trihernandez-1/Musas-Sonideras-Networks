import { useMemo, useRef, useState } from 'react';
import type { Place, Tag } from '../types/models';
import { normalizeForSearch, upsertPlace } from '../db/repos';
import { MEXICO_CITY_CENTER } from '../constants';
import PlacePanel from './PlacePanel';

/** Single-select search/create picker for linking a post (or anything else) to a place,
 * usable outside the Map screen — e.g. the Inbox, which has no Leaflet map on screen. */
export default function PlacePicker({
  allPlaces,
  selectedId,
  onChange,
  onPlaceCreated,
  allTags,
  onCreateTag,
}: {
  allPlaces: Place[];
  selectedId?: string;
  onChange: (id: string | undefined) => void;
  onPlaceCreated: (place: Place) => void;
  allTags: Tag[];
  onCreateTag: (label: string) => Promise<Tag>;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = allPlaces.find((p) => p.id === selectedId);

  const matches = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    if (!q) return allPlaces.slice(0, 8);
    return allPlaces.filter((p) => normalizeForSearch(p.name).includes(q)).slice(0, 8);
  }, [allPlaces, query]);

  if (creating) {
    return (
      <PlacePanel
        place={{ name: query.trim(), lat: MEXICO_CITY_CENTER[0], lng: MEXICO_CITY_CENTER[1], placeTypeTagIds: [], notes: '' }}
        allTags={allTags}
        onCreateTag={onCreateTag}
        allowMapClick={false}
        onLocationPicked={() => {}}
        onCancel={() => setCreating(false)}
        onSave={async (fields) => {
          const place = await upsertPlace(fields);
          onPlaceCreated(place);
          onChange(place.id);
          setCreating(false);
        }}
      />
    );
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
        <span>{selected.name}</span>
        <button type="button" className="btn ghost" style={{ padding: '0.15em 0.6em' }} onClick={() => onChange(undefined)}>
          Remove
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
        placeholder="No location — type to search or add one…"
        style={{
          width: '100%',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem 0.75rem',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
        }}
      />
      {open && (
        <div
          className="card"
          style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 4px)', left: 0, right: 0, padding: '0.4rem', maxHeight: '240px', overflowY: 'auto' }}
        >
          {matches.map((p) => (
            <div
              key={p.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(p.id);
                setQuery('');
              }}
              style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {p.name}
              {p.address && <span style={{ color: 'var(--color-text-muted)' }}> — {p.address}</span>}
            </div>
          ))}
          <div
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setCreating(true)}
            style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', borderRadius: 'var(--radius-sm)', color: 'var(--color-accent-2)', fontWeight: 600 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            + Add a new place{query.trim() && ` "${query.trim()}"`}
          </div>
        </div>
      )}
    </div>
  );
}
