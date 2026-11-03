import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Polyline, TileLayer, useMapEvents } from 'react-leaflet';
import type { Collaborator, EventRecord, Place, Post } from '../types/models';
import { HERITAGE_DECLARATION_DATE } from '../types/models';
import {
  deletePlace,
  getAllCollaborators,
  getAllEvents,
  getAllPlaces,
  getAllPosts,
  upsertEvent,
  upsertPlace,
} from '../db/repos';
import { useTags } from '../hooks/useTags';
import ClusterLayer from '../components/ClusterLayer';
import DateRangeSlider from '../components/DateRangeSlider';
import PlacePanel from '../components/PlacePanel';
import TagChip from '../components/TagChip';
import StoredImageView from '../components/StoredImageView';
import PostLightbox from '../components/PostLightbox';
import { MEXICO_CITY_CENTER } from '../constants';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

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
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const { tags, createTag } = useTags();

  const [tagFilterIds, setTagFilterIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [showSharedLines, setShowSharedLines] = useState(false);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [placeDraft, setPlaceDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);

  const load = useCallback(async () => {
    const [p, e, po, c] = await Promise.all([getAllPlaces(), getAllEvents(), getAllPosts(), getAllCollaborators()]);
    setPlaces(p);
    setEvents(e);
    setPosts(po);
    setCollaborators(c);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { minDate, maxDate } = useMemo(() => {
    const dates = [
      ...events.map((e) => e.startDate),
      ...posts.filter((p) => p.placeId).map((p) => p.postDate),
    ].sort();
    if (dates.length === 0) {
      const now = todayISO();
      return { minDate: now, maxDate: now };
    }
    return { minDate: dates[0], maxDate: dates[dates.length - 1] };
  }, [events, posts]);

  const effectiveRange = dateRange ?? [minDate, maxDate];

  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const postById = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);
  const collaboratorById = useMemo(() => new Map(collaborators.map((c) => [c.id, c])), [collaborators]);
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const eventsInRange = useMemo(
    () =>
      events.filter((e) => {
        if (e.startDate < effectiveRange[0] || e.startDate > effectiveRange[1]) return false;
        if (tagFilterIds.length > 0 && !tagFilterIds.some((tid) => e.tagIds.includes(tid))) return false;
        return true;
      }),
    [events, effectiveRange, tagFilterIds],
  );

  const placedEvents = useMemo(() => eventsInRange.filter((e) => e.placeId && placeById.has(e.placeId)), [eventsInRange, placeById]);
  const unplacedEvents = useMemo(() => eventsInRange.filter((e) => !e.placeId), [eventsInRange]);

  // Posts can carry their own place independent of any linked event (not every post
  // belongs to a formal event), so they get their own pins too.
  const placedPosts = useMemo(
    () =>
      posts.filter((p) => {
        if (!p.placeId || !placeById.has(p.placeId)) return false;
        if (p.postDate < effectiveRange[0] || p.postDate > effectiveRange[1]) return false;
        if (tagFilterIds.length > 0 && !tagFilterIds.some((tid) => p.tagIds.includes(tid))) return false;
        return true;
      }),
    [posts, placeById, effectiveRange, tagFilterIds],
  );

  const markerItems = useMemo(
    () => [
      ...placedEvents.map((e) => {
        const place = placeById.get(e.placeId!)!;
        return { id: `event:${e.id}`, lat: place.lat, lng: place.lng };
      }),
      ...placedPosts.map((p) => {
        const place = placeById.get(p.placeId!)!;
        return { id: `post:${p.id}`, lat: place.lat, lng: place.lng };
      }),
    ],
    [placedEvents, placedPosts, placeById],
  );

  // Lines between places that share a collaborator, among the currently-visible events.
  const sharedLines = useMemo(() => {
    if (!showSharedLines) return [];
    const collaboratorsByPlace = new Map<string, Set<string>>();
    for (const e of placedEvents) {
      const set = collaboratorsByPlace.get(e.placeId!) ?? new Set<string>();
      e.collaboratorIds.forEach((cid) => set.add(cid));
      collaboratorsByPlace.set(e.placeId!, set);
    }
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
  }, [showSharedLines, placedEvents, placedPosts, placeById]);

  const selectedEvent = selectedEventId ? events.find((e) => e.id === selectedEventId) : null;
  const selectedEventPlace = selectedEvent?.placeId ? placeById.get(selectedEvent.placeId) : null;
  const selectedEventPosts = selectedEvent
    ? selectedEvent.postIds.map((pid) => postById.get(pid)).filter((p): p is Post => Boolean(p))
    : [];
  const selectedPost = selectedPostId ? postById.get(selectedPostId) : null;

  function handleMarkerClick(prefixedId: string) {
    const [kind, id] = prefixedId.split(':');
    setPlaceDraft(null);
    setEditingPlace(null);
    if (kind === 'event') {
      setSelectedEventId(id);
      setSelectedPostId(null);
    } else {
      setSelectedPostId(id);
      setSelectedEventId(null);
    }
  }

  function toggleTagFilter(id: string) {
    setTagFilterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleMapClick(lat: number, lng: number) {
    setSelectedEventId(null);
    setSelectedPostId(null);
    setEditingPlace(null);
    setPlaceDraft({ lat, lng });
  }

  async function handleSavePlace(fields: Omit<Place, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    await upsertPlace(fields);
    setPlaceDraft(null);
    setEditingPlace(null);
    await load();
  }

  async function handleDeletePlace(id: string) {
    if (!confirm('Delete this place? Events that used it will keep their records but lose the location.')) return;
    await deletePlace(id);
    setEditingPlace(null);
    await load();
  }

  async function handleAssignPlace(eventId: string, placeId: string) {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    await upsertEvent({
      id: event.id,
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      placeId,
      description: event.description,
      interpretation: event.interpretation,
      postIds: event.postIds,
      collaboratorIds: event.collaboratorIds,
      tagIds: event.tagIds,
    });
    await load();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h1>Map</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Events and located posts as pins, clustered when zoomed out. Click anywhere on the
          map, or search an address, to save a new place — then pick it from the Inbox when
          adding a post, or from the list below for an existing event.
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
        <div className="card print-target" style={{ padding: 0, height: '620px', overflow: 'hidden' }}>
          <MapContainer center={MEXICO_CITY_CENTER} zoom={11} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onClick={handleMapClick} />
            <ClusterLayer items={markerItems} onItemClick={handleMarkerClick} />
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

          {!placeDraft && !editingPlace && !selectedPost && selectedEvent && (
            <div className="card">
              <h2>
                <Link to={`/events/${selectedEvent.id}`}>{selectedEvent.name}</Link>
              </h2>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                {selectedEvent.startDate}
                {selectedEvent.endDate && selectedEvent.endDate !== selectedEvent.startDate ? ` – ${selectedEvent.endDate}` : ''}
                {selectedEventPlace && <> · {selectedEventPlace.name}</>}
              </div>
              {selectedEvent.description && <p>{selectedEvent.description}</p>}
              {selectedEvent.collaboratorIds.length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <FieldLabel>Collaborators</FieldLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {selectedEvent.collaboratorIds.map((cid) => (
                      <Link key={cid} to={`/collaborators/${cid}`} style={{ fontSize: '0.85rem' }}>
                        {collaboratorById.get(cid)?.name ?? 'Unknown'}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {selectedEventPosts.length > 0 && (
                <div>
                  <FieldLabel>Posts</FieldLabel>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedEventPosts.map((post) => (
                      <div key={post.id} style={{ width: '72px' }}>
                        {post.imageIds[0] && (
                          <StoredImageView
                            imageId={post.imageIds[0]}
                            alt={post.postDate}
                            style={{ width: '72px', height: '90px', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                          />
                        )}
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{post.postDate}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedEventPlace && (
                <button type="button" className="btn ghost" style={{ marginTop: '0.75rem' }} onClick={() => setEditingPlace(selectedEventPlace)}>
                  Edit place
                </button>
              )}
            </div>
          )}

          {!placeDraft && !editingPlace && !selectedEvent && !selectedPost && (
            <>
              {unplacedEvents.length > 0 && (
                <div className="card">
                  <h2>Events without a place</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {unplacedEvents.map((ev) => (
                      <div key={ev.id} style={{ fontSize: '0.85rem' }}>
                        <div>
                          {ev.name} <span style={{ color: 'var(--color-text-muted)' }}>({ev.startDate})</span>
                        </div>
                        <select
                          defaultValue=""
                          onChange={(e) => e.target.value && handleAssignPlace(ev.id, e.target.value)}
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
                  {places.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setEditingPlace(p);
                        setFlyTo([p.lat, p.lng]);
                      }}
                      style={{ fontSize: '0.85rem', cursor: 'pointer', padding: '0.3rem 0', borderBottom: '1px solid var(--color-border)' }}
                    >
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                        {p.placeTypeTagIds.map((tid) => tagById.get(tid)).filter((t): t is NonNullable<typeof t> => Boolean(t)).map((tag) => (
                          <TagChip key={tag.id} tag={tag} size="sm" />
                        ))}
                      </div>
                    </div>
                  ))}
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
          eventName={selectedPost.eventId ? events.find((e) => e.id === selectedPost.eventId)?.name : undefined}
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
