import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Collaborator, EventRecord, Place, Post } from '../types/models';
import {
  deleteEvent,
  getAllCollaborators,
  getAllPlaces,
  getAllPosts,
  getEvent,
  quickCreateCollaborator,
  upsertEvent,
} from '../db/repos';
import { useTags } from '../hooks/useTags';
import TagChip from '../components/TagChip';
import StoredImageView from '../components/StoredImageView';
import MiniMap from '../components/MiniMap';
import EventForm from '../components/EventForm';
import { describeCleanup } from '../utils/describeCleanup';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tags, createTag } = useTags();

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [draft, setDraft] = useState<EventRecord | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [e, allPosts, allPlaces, allCollaborators] = await Promise.all([
      getEvent(id),
      getAllPosts(),
      getAllPlaces(),
      getAllCollaborators(),
    ]);
    setEvent(e ?? null);
    setDraft(e ?? null);
    setPosts(allPosts.filter((p) => p.eventId === id));
    setPlaces(allPlaces);
    setCollaborators(allCollaborators);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);
  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const collaboratorById = useMemo(() => new Map(collaborators.map((c) => [c.id, c])), [collaborators]);

  if (!event || !draft) {
    return <div className="card">Loading…</div>;
  }

  const place = event.placeId ? placeById.get(event.placeId) : undefined;

  async function handleSave() {
    if (!draft) return;
    await upsertEvent(draft);
    setEditing(false);
    await load();
  }

  async function handleDelete() {
    if (!event) return;
    if (!confirm(`Delete "${event.name}"? Posts linked to it keep their records but lose this link.`)) return;
    const summary = await deleteEvent(event.id);
    const cleanupNote = describeCleanup(summary);
    if (cleanupNote) alert(cleanupNote);
    navigate('/map');
  }

  return (
    <div className="print-target" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="no-print">
        <Link to="/gallery">&larr; Back to Gallery</Link>
      </div>

      <div className="card">
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <EventForm
              value={draft}
              onChange={(patch) => setDraft({ ...draft, ...patch })}
              places={places}
              onPlaceCreated={(place) => setPlaces((prev) => [...prev, place])}
              collaborators={collaborators}
              onCreateCollaborator={async (handle) => {
                const c = await quickCreateCollaborator(handle);
                setCollaborators((prev) => [...prev, c]);
                return c;
              }}
              tags={tags}
              onCreateTag={createTag}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn" onClick={handleSave}>
                Save
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  setDraft(event);
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1>{event.name}</h1>
            <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              {event.startDate}
              {event.endDate && event.endDate !== event.startDate ? ` – ${event.endDate}` : ''}
              {place && <> · {place.name}</>}
            </div>
            {event.description && <p>{event.description}</p>}
            {event.interpretation && (
              <div dangerouslySetInnerHTML={{ __html: event.interpretation }} style={{ marginTop: '0.5rem' }} />
            )}
            {event.collaboratorIds.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <FieldLabel>Collaborators</FieldLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem' }}>
                  {event.collaboratorIds.map((cid) => {
                    const role = event.collaboratorRoles?.[cid];
                    return (
                      <span key={cid}>
                        <Link to={`/collaborators/${cid}`}>{collaboratorById.get(cid)?.name ?? 'Unknown'}</Link>
                        {role && <span style={{ color: 'var(--color-text-muted)' }}> — {role}</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {event.tagIds.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                {event.tagIds.map((tid) => tagById.get(tid)).filter((t): t is NonNullable<typeof t> => Boolean(t)).map((tag) => (
                  <TagChip key={tag.id} tag={tag} />
                ))}
              </div>
            )}
            <div className="no-print" style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button className="btn secondary" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button className="btn ghost" onClick={() => window.print()}>
                Print profile
              </button>
              <button className="btn danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {place && (
        <div className="card no-print">
          <h2>Location</h2>
          <MiniMap places={[place]} />
        </div>
      )}

      <div className="card">
        <h2>Posts ({posts.length})</h2>
        {posts.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No posts linked yet.</p>}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {posts.map((post) => (
            <div key={post.id} style={{ width: '110px' }}>
              {post.imageIds[0] && (
                <StoredImageView
                  imageId={post.imageIds[0]}
                  alt={post.postDate}
                  style={{ width: '110px', height: '140px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                />
              )}
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{post.postDate}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>{children}</div>;
}
