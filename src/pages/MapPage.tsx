import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, Polyline, TileLayer, useMapEvents } from 'react-leaflet';
import type { Collaborator, Place, Post } from '../types/models';
import { HERITAGE_DECLARATION_DATE } from '../types/models';
import { deletePlace, getAllCollaborators, getAllPlaces, getAllPosts, upsertPlace, upsertPost } from '../db/repos';
import { useTags } from '../hooks/useTags';
import { usePostThemes } from '../hooks/usePostThemes';
import ClusterLayer from '../components/ClusterLayer';
import DensityLayer from '../components/DensityLayer';
import HeatmapLayer from '../components/HeatmapLayer';
import DateRangeSlider from '../components/DateRangeSlider';
import PlacePanel from '../components/PlacePanel';
import TagChip from '../components/TagChip';
import StoredImageView from '../components/StoredImageView';
import PostLightbox from '../components/PostLightbox';
import { MEXICO_CITY_CENTER } from '../constants';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function postLabel(p: Post): string {
  return p.name || p.postDate;
}

const DENSITY_SCALE_MIN = 0.5;
const DENSITY_SCALE_MAX = 2;
const DENSITY_SCALE_STEP = 0.25;

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const { tags, createTag } = useTags();
  const { themes } = usePostThemes();

  const [tagFilterIds, setTagFilterIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [showSharedLines, setShowSharedLines] = useState(false);
  const [viewMode, setViewMode] = useState<'locations' | 'density' | 'heatmap'>('locations');
  const [densityScale, setDensityScale] = useState(1);

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [placeDraft, setPlaceDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);

  const load = useCallback(async () => {
    const [p, po, c] = await Promise.all([getAllPlaces(), getAllPosts(), getAllCollaborators()]);
    setPlaces(p);
    setPosts(po);
    setCollaborators(c);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { minDate, maxDate } = useMemo(() => {
    const dates = posts.filter((p) => p.placeId).map((p) => p.postDate).sort();
    if (dates.length === 0) {
      const now = todayISO();
      return { minDate: now, maxDate: now };
    }
    return { minDate: dates[0], maxDate: dates[dates.length - 1] };
  }, [posts]);

  const effectiveRange = dateRange ?? [minDate, maxDate];

  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const postById = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);
  const collaboratorById = useMemo(() => new Map(collaborators.map((c) => [c.id, c])), [collaborators]);
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);
  const themeById = useMemo(() => new Map(themes.map((t) => [t.id, t])), [themes]);

  const postsInRange = useMemo(
    () =>
      posts.filter((p) => {
        if (p.postDate < effectiveRange[0] || p.postDate > effectiveRange[1]) return false;
        if (tagFilterIds.length > 0 && !tagFilterIds.some((tid) => p.tagIds.includes(tid))) return false;
        return true;
      }),
    [posts, effectiveRange, tagFilterIds],
  );

  const placedPosts = useMemo(() => postsInRange.filter((p) => p.placeId && placeById.has(p.placeId)), [postsInRange, placeById]);
  const unplacedPosts = useMemo(() => postsInRange.filter((p) => !p.placeId), [postsInRange]);

  // One marker per place (not per record), so several records at the same location collapse
  // into a single pin instead of stacking duplicate markers on top of each other — clicking
  // it opens that place's own description first, with the records there listed underneath,
  // rather than landing on one of them at random. A place still only appears while something
  // at it is within the active tag/date filter, matching how pins have always respected those.
  const visiblePlaceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of placedPosts) ids.add(p.placeId!);
    return ids;
  }, [placedPosts]);

  const markerItems = useMemo(
    () =>
      Array.from(visiblePlaceIds).map((placeId) => {
        const place = placeById.get(placeId)!;
        return { id: `place:${placeId}`, lat: place.lat, lng: place.lng };
      }),
    [visiblePlaceIds, placeById],
  );

  // How many of the currently-visible records happened at each place — the shared basis for
  // both the Density bubbles and the Heatmap glow, and for the count shown in the place list.
  const placeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of placedPosts) counts.set(p.placeId!, (counts.get(p.placeId!) ?? 0) + 1);
    return counts;
  }, [placedPosts]);

  const densityItems = useMemo(
    () =>
      Array.from(visiblePlaceIds).map((placeId) => {
        const place = placeById.get(placeId)!;
        return { id: `place:${placeId}`, lat: place.lat, lng: place.lng, count: placeCounts.get(placeId) ?? 0 };
      }),
    [visiblePlaceIds, placeById, placeCounts],
  );

  const heatPoints = useMemo(
    () =>
      Array.from(visiblePlaceIds).map((placeId) => {
        const place = placeById.get(placeId)!;
        return { lat: place.lat, lng: place.lng, intensity: placeCounts.get(placeId) ?? 0 };
      }),
    [visiblePlaceIds, placeById, placeCounts],
  );

  // Lines between places that share a collaborator, among the currently-visible records.
  const sharedLines = useMemo(() => {
    if (!showSharedLines) return [];
    const collaboratorsByPlace = new Map<string, Set<string>>();
    for (const p of placedPosts) {
      const set = collaboratorsByPlace.get(p.placeId!) ?? new Set<string>();
      p.collaboratorIds.forEach((cid) => set.add(cid));
      collaboratorsByPlace.set(p.placeId!, set);
    }
    const placeIds = Array.from(collaboratorsByPlace.keys());
    const lines: { id: string; positions: [number, number][]; shared: string[] }[] = [];
    for (let i = 0; i < placeIds.length; i++) {
      for (let j = i + 1; j < placeIds.length; j++) {
        const a = collaboratorsByPlace.get(placeIds[i])!;
        const b = collaboratorsByPlace.get(placeIds[j])!;
        const shared = Array.from(a).filter((id) => b.has(id));
        if (shared.length === 0) continue;
        const placeA = placeById.get(placeIds[i]);
        const placeB = placeById.get(placeIds[j]);
        if (!placeA || !placeB) continue;
        lines.push({
          id: `${placeIds[i]}__${placeIds[j]}`,
          positions: [
            [placeA.lat, placeA.lng],
            [placeB.lat, placeB.lng],
          ],
          shared,
        });
      }
    }
    return lines;
  }, [showSharedLines, placedPosts, placeById]);

  const selectedPost = selectedPostId ? postById.get(selectedPostId) : null;
  const selectedPlace = selectedPlaceId ? placeById.get(selectedPlaceId) : null;
  const selectedPlacePosts = useMemo(
    () => (selectedPlace ? posts.filter((p) => p.placeId === selectedPlace.id).sort((a, b) => b.postDate.localeCompare(a.postDate)) : []),
    [selectedPlace, posts],
  );

  function handleMarkerClick(prefixedId: string) {
    const [kind, id] = prefixedId.split(':');
    setPlaceDraft(null);
    setEditingPlace(null);
    if (kind === 'place') {
      setSelectedPlaceId(id);
      setSelectedPostId(null);
    }
  }

  function toggleTagFilter(id: string) {
    setTagFilterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleMapClick(lat: number, lng: number) {
    setSelectedPostId(null);
    setSelectedPlaceId(null);
    setEditingPlace(null);
    setPlaceDraft({ lat, lng });
  }

  async function handleSavePlace(fields: Omit<Place, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const saved = await upsertPlace(fields);
    setPlaceDraft(null);
    setEditingPlace(null);
    if (selectedPlaceId) setSelectedPlaceId(saved.id);
    await load();
  }

  async function handleDeletePlace(id: string) {
    if (!confirm('Delete this place? Records that used it will keep their data but lose the location.')) return;
    await deletePlace(id);
    setEditingPlace(null);
    setSelectedPlaceId(null);
    await load();
  }

  async function handleAssignPlace(postId: string, placeId: string) {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    await upsertPost({ ...post, placeId });
    await load();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h1>Map</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          {viewMode === 'locations' &&
            "Places with located records as pins, clustered when zoomed out — click one to see that place's type and notes, then open any record held there."}
          {viewMode === 'density' &&
            'One bubble per place, sized and numbered by how many of the currently-filtered records happened there — bigger and darker means busier.'}
          {viewMode === 'heatmap' &&
            'A density glow weighted by how many records happened at each place — brighter spots are busier locations.'}
          {' '}Click anywhere on the map, or search an address, to save a new place — then pick
          it from the Inbox when adding a record, or from the list below for an existing one.
        </p>

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <FieldLabel>Filter by tag</FieldLabel>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', maxWidth: '360px' }}>
              {tags.length === 0 && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No tags yet</span>}
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  onClick={() => toggleTagFilter(tag.id)}
                  style={{ cursor: 'pointer', opacity: tagFilterIds.length === 0 || tagFilterIds.includes(tag.id) ? 1 : 0.4 }}
                >
                  <TagChip tag={tag} size="sm" />
                </span>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '280px' }}>
            <FieldLabel>Date range</FieldLabel>
            <DateRangeSlider
              minDate={minDate}
              maxDate={maxDate}
              value={effectiveRange}
              onChange={setDateRange}
              markDate={HERITAGE_DECLARATION_DATE}
              markLabel="Heritage declaration — Oct 6, 2023"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn ghost" onClick={() => setDateRange([minDate, maxDate])}>
            Full range
          </button>
          <button type="button" className="btn ghost" onClick={() => setDateRange([minDate, HERITAGE_DECLARATION_DATE])}>
            Before heritage declaration
          </button>
          <button type="button" className="btn ghost" onClick={() => setDateRange([HERITAGE_DECLARATION_DATE, maxDate])}>
            Since heritage declaration
          </button>
          <button type="button" className="btn ghost" onClick={() => window.print()} title="Opens the print dialog with just the map — choose 'Save as PDF' for an image file">
            Export map (print)
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', marginLeft: 'auto' }}>
            <input type="checkbox" checked={showSharedLines} onChange={(e) => setShowSharedLines(e.target.checked)} />
            Show lines between places that share a collaborator
          </label>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', marginBottom: 0 }}>
          "Export map" opens your browser's print dialog showing just the map — choose "Save as
          PDF" there for a file, or take a screenshot of the preview. A direct one-click PNG
          isn't reliable for map tiles specifically, since OpenStreetMap's tile server doesn't
          allow browsers to read map imagery back out for export; printing sidesteps that.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="card no-print" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className={viewMode === 'locations' ? 'btn' : 'btn ghost'} onClick={() => setViewMode('locations')}>
                Locations
              </button>
              <button type="button" className={viewMode === 'density' ? 'btn' : 'btn ghost'} onClick={() => setViewMode('density')}>
                Density
              </button>
              <button type="button" className={viewMode === 'heatmap' ? 'btn' : 'btn ghost'} onClick={() => setViewMode('heatmap')}>
                Heatmap
              </button>
            </div>
            {viewMode === 'density' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FieldLabel>Bubble size</FieldLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ padding: '0.2em 0.7em' }}
                    disabled={densityScale <= DENSITY_SCALE_MIN}
                    onClick={() => setDensityScale((s) => Math.max(DENSITY_SCALE_MIN, Math.round((s - DENSITY_SCALE_STEP) * 100) / 100))}
                    aria-label="Shrink bubbles"
                  >
                    −
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', minWidth: '3.2em', textAlign: 'center' }}>
                    {Math.round(densityScale * 100)}%
                  </span>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ padding: '0.2em 0.7em' }}
                    disabled={densityScale >= DENSITY_SCALE_MAX}
                    onClick={() => setDensityScale((s) => Math.min(DENSITY_SCALE_MAX, Math.round((s + DENSITY_SCALE_STEP) * 100) / 100))}
                    aria-label="Enlarge bubbles"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="card print-target" style={{ padding: 0, height: '620px', overflow: 'hidden' }}>
          <MapContainer center={MEXICO_CITY_CENTER} zoom={11} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onClick={handleMapClick} />
            {viewMode === 'locations' && <ClusterLayer items={markerItems} onItemClick={handleMarkerClick} />}
            {viewMode === 'density' && <DensityLayer items={densityItems} onItemClick={handleMarkerClick} scale={densityScale} />}
            {viewMode === 'heatmap' && <HeatmapLayer points={heatPoints} />}
            {sharedLines.map((line) => (
              <Polyline
                key={line.id}
                positions={line.positions}
                pathOptions={{ color: '#5e2a52', weight: 2, dashArray: '6 5', opacity: 0.7 }}
              />
            ))}
            <FlyToController target={flyTo} />
          </MapContainer>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {placeDraft && (
            <PlacePanel
              place={{ name: '', lat: placeDraft.lat, lng: placeDraft.lng, placeTypeTagIds: [], notes: '' }}
              allTags={tags}
              onCreateTag={createTag}
              onSave={handleSavePlace}
              onCancel={() => setPlaceDraft(null)}
              onLocationPicked={(lat, lng) => setFlyTo([lat, lng])}
            />
          )}

          {editingPlace && (
            <PlacePanel
              place={editingPlace}
              allTags={tags}
              onCreateTag={createTag}
              onSave={handleSavePlace}
              onCancel={() => setEditingPlace(null)}
              onDelete={() => handleDeletePlace(editingPlace.id)}
              onLocationPicked={(lat, lng) => setFlyTo([lat, lng])}
            />
          )}

          {!placeDraft && !editingPlace && !selectedPost && selectedPlace && (
            <div className="card">
              <h2>{selectedPlace.name}</h2>
              {selectedPlace.address && (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{selectedPlace.address}</div>
              )}
              {selectedPlace.placeTypeTagIds.length > 0 && (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {selectedPlace.placeTypeTagIds.map((tid) => tagById.get(tid)).filter((t): t is NonNullable<typeof t> => Boolean(t)).map((tag) => (
                    <TagChip key={tag.id} tag={tag} size="sm" />
                  ))}
                </div>
              )}
              {selectedPlace.notes ? (
                <p>{selectedPlace.notes}</p>
              ) : (
                <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No notes yet.</p>
              )}

              {selectedPlacePosts.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <FieldLabel>Records here ({selectedPlacePosts.length})</FieldLabel>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedPlacePosts.map((post) =>
                      post.imageIds[0] ? (
                        <div key={post.id} style={{ width: '72px', cursor: 'pointer' }} onClick={() => setSelectedPostId(post.id)}>
                          <StoredImageView
                            imageId={post.imageIds[0]}
                            alt={postLabel(post)}
                            style={{ width: '72px', height: '90px', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                          />
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{post.postDate}</div>
                        </div>
                      ) : (
                        <button
                          key={post.id}
                          type="button"
                          className="chip"
                          style={{ cursor: 'pointer', fontSize: '0.8rem' }}
                          onClick={() => setSelectedPostId(post.id)}
                        >
                          {postLabel(post)}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}

              <button type="button" className="btn ghost" style={{ marginTop: '0.75rem' }} onClick={() => setEditingPlace(selectedPlace)}>
                Edit place
              </button>
            </div>
          )}

          {!placeDraft && !editingPlace && !selectedPlace && !selectedPost && (
            <>
              {unplacedPosts.length > 0 && (
                <div className="card">
                  <h2>Records without a place</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {unplacedPosts.map((post) => (
                      <div key={post.id} style={{ fontSize: '0.85rem' }}>
                        <div>
                          {postLabel(post)} <span style={{ color: 'var(--color-text-muted)' }}>({post.postDate})</span>
                        </div>
                        <select
                          defaultValue=""
                          onChange={(e) => e.target.value && handleAssignPlace(post.id, e.target.value)}
                          style={{ ...inputStyle, marginTop: '0.25rem' }}
                          disabled={places.length === 0}
                        >
                          <option value="" disabled>
                            {places.length === 0 ? 'Add a place first…' : 'Assign a place…'}
                          </option>
                          {places.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card">
                <h2>All places ({places.length})</h2>
                {places.length === 0 && (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    None yet — click the map or search an address to add one.
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '340px', overflowY: 'auto' }}>
                  {[...places]
                    .sort((a, b) => (placeCounts.get(b.id) ?? 0) - (placeCounts.get(a.id) ?? 0) || a.name.localeCompare(b.name, 'es'))
                    .map((p) => {
                      const count = placeCounts.get(p.id) ?? 0;
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPlaceId(p.id);
                            setSelectedPostId(null);
                            setFlyTo([p.lat, p.lng]);
                          }}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', padding: '0.3rem 0', borderBottom: '1px solid var(--color-border)' }}
                        >
                          <div>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                              {p.placeTypeTagIds.map((tid) => tagById.get(tid)).filter((t): t is NonNullable<typeof t> => Boolean(t)).map((tag) => (
                                <TagChip key={tag.id} tag={tag} size="sm" />
                              ))}
                            </div>
                          </div>
                          {count > 0 && (
                            <span style={{ flexShrink: 0, color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedPost && (
        <PostLightbox
          post={selectedPost}
          collaboratorById={collaboratorById}
          tagById={tagById}
          themeById={themeById}
          placeName={selectedPost.placeId ? placeById.get(selectedPost.placeId)?.name : undefined}
          onClose={() => setSelectedPostId(null)}
        />
      )}
    </div>
  );
}

function FlyToController({ target }: { target: [number, number] | null }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 14));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return null;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '0.45rem 0.6rem',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
};
