import { useState } from 'react';
import type { Place, Tag } from '../types/models';
import { searchAddress } from '../utils/nominatim';
import type { NominatimResult } from '../utils/nominatim';
import TagMultiSelect from './TagMultiSelect';

export default function PlacePanel({
  place,
  allTags,
  onCreateTag,
  onSave,
  onCancel,
  onDelete,
  onLocationPicked,
  allowMapClick = true,
}: {
  /** A place being created (lat/lng + optional name prefilled) or edited (has an id). */
  place: { id?: string; name: string; address?: string; lat: number; lng: number; placeTypeTagIds: string[]; notes: string };
  allTags: Tag[];
  onCreateTag: (label: string) => Promise<Tag>;
  onSave: (fields: Omit<Place, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onCancel: () => void;
  onDelete?: () => void;
  /** Called when the researcher picks an address search result, to re-center the map there. */
  onLocationPicked: (lat: number, lng: number) => void;
  /** Whether this panel sits next to an actual Leaflet map the researcher can click
   * (true on the Map screen; false where it's used standalone, e.g. the Inbox). */
  allowMapClick?: boolean;
}) {
  const [name, setName] = useState(place.name);
  const [address, setAddress] = useState(place.address ?? '');
  const [notes, setNotes] = useState(place.notes);
  const [tagIds, setTagIds] = useState<string[]>(place.placeTypeTagIds);
  const [lat, setLat] = useState(place.lat);
  const [lng, setLng] = useState(place.lng);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const found = await searchAddress(query);
      setResults(found);
      if (found.length === 0) setSearchError('No results. Try a different search.');
    } catch {
      setSearchError('Address search failed. Try again in a moment.');
    } finally {
      setSearching(false);
    }
  }

  function pickResult(r: NominatimResult) {
    setLat(r.lat);
    setLng(r.lng);
    setAddress(r.displayName);
    if (!name.trim()) setName(r.displayName.split(',')[0]);
    setResults([]);
    setQuery('');
    onLocationPicked(r.lat, r.lng);
  }

  return (
    <div className="card">
      <h2>{place.id ? 'Edit place' : 'New place'}</h2>

      {!place.id && (
        <div style={{ marginBottom: '1rem' }}>
          <FieldLabel>Search address</FieldLabel>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
              placeholder="e.g. Salón Los Ángeles, CDMX"
              style={inputStyle}
            />
            <button type="button" className="btn secondary" onClick={handleSearch} disabled={searching}>
              {searching ? '…' : 'Search'}
            </button>
          </div>
          {searchError && <div style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '0.3rem' }}>{searchError}</div>}
          {results.length > 0 && (
            <div style={{ marginTop: '0.4rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              {results.map((r, i) => (
                <div
                  key={i}
                  onClick={() => pickResult(r)}
                  style={{ padding: '0.5rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem', borderBottom: i < results.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {r.displayName}
                </div>
              ))}
            </div>
          )}
          {allowMapClick && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
              Or click anywhere on the map to drop a pin there instead.
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <FieldLabel>Name</FieldLabel>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Place name" style={inputStyle} />
        </div>
        <div>
          <FieldLabel>Address</FieldLabel>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Latitude</FieldLabel>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(Number(e.target.value))}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Longitude</FieldLabel>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(Number(e.target.value))}
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <FieldLabel>Type</FieldLabel>
          <TagMultiSelect allTags={allTags} selectedIds={tagIds} onChange={setTagIds} onCreateTag={onCreateTag} placeholder="e.g. venue, plaza, market…" />
        </div>
        <div>
          <FieldLabel>Notes</FieldLabel>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', justifyContent: 'space-between' }}>
        <div>
          {onDelete && (
            <button type="button" className="btn danger" onClick={onDelete}>
              Delete
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            disabled={!name.trim()}
            onClick={() => onSave({ id: place.id, name: name.trim(), address: address.trim() || undefined, lat, lng, placeTypeTagIds: tagIds, notes })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '0.3rem' }}>{children}</label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '0.5rem 0.75rem',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
};
