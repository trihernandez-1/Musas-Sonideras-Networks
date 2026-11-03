import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Collaborator, Connection, EventRecord, Place, Post } from '../types/models';
import {
  deleteCollaborator,
  deleteImage,
  getAllCollaborators,
  getAllConnections,
  getAllEvents,
  getAllPlaces,
  getAllPosts,
  getCollaborator,
  saveImage,
  upsertCollaborator,
} from '../db/repos';
import { useTags } from '../hooks/useTags';
import TagMultiSelect from '../components/TagMultiSelect';
import TagChip from '../components/TagChip';
import StoredImageView from '../components/StoredImageView';
import MiniMap from '../components/MiniMap';

export default function CollaboratorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tags, createTag } = useTags();

  const [collaborator, setCollaborator] = useState<Collaborator | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [allCollaborators, setAllCollaborators] = useState<Collaborator[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Collaborator | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [c, allPosts, allEvents, allConnections, allPlaces] = await Promise.all([
      getCollaborator(id),
      getAllPosts(),
      getAllEvents(),
      getAllConnections(),
      getAllPlaces(),
    ]);
    setCollaborator(c ?? null);
    setDraft(c ?? null);
    setPosts(allPosts.filter((p) => p.collaboratorIds.includes(id)));
    setEvents(allEvents.filter((e) => e.collaboratorIds.includes(id)));
    setConnections(
      allConnections.filter((conn) => conn.collaboratorAId === id || conn.collaboratorBId === id),
    );
    setPlaces(allPlaces);
    setAllCollaborators(await getAllCollaborators());
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const myPlaceIds = useMemo(() => {
    const ids = new Set<string>();
    events.forEach((e) => e.placeId && ids.add(e.placeId));
    posts.forEach((p) => p.placeId && ids.add(p.placeId));
    return ids;
  }, [events, posts]);
  const myPlaces = places.filter((p) => myPlaceIds.has(p.id));

  const collaboratorById = useMemo(
    () => new Map(allCollaborators.map((c) => [c.id, c])),
    [allCollaborators],
  );
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  if (!collaborator || !draft) {
    return <div className="card">Loading…</div>;
  }

  async function handleSave() {
    if (!draft) return;
    await upsertCollaborator(draft);
    setEditing(false);
    await load();
  }

  async function handleProfileImageChange(file: File) {
    if (!draft) return;
    if (draft.profileImageId) await deleteImage(draft.profileImageId);
    const img = await saveImage(file, file.name);
    setDraft({ ...draft, profileImageId: img.id });
  }

  async function handleDelete() {
    if (!collaborator) return;
    if (
      !confirm(
        `Delete ${collaborator.name}? This removes them from the collaborator list and from any manual connections. Posts and events that mention them keep their records but lose this link.`,
      )
    )
      return;
    await deleteCollaborator(collaborator.id);
    navigate('/collaborators');
  }

  return (
    <div className="print-target" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <Link to="/collaborators" className="no-print">
        &larr; Back to Collaborators
      </Link>

      <div className="card" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ width: '140px', flexShrink: 0 }}>
          {draft.profileImageId ? (
            <StoredImageView
              imageId={draft.profileImageId}
              alt={collaborator.name}
              style={{
                width: '140px',
                height: '140px',
                objectFit: 'cover',
                borderRadius: '50%',
                border: '3px solid var(--color-primary)',
              }}
            />
          ) : (
            <div
              style={{
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                color: 'var(--color-text-muted)',
              }}
            >
              {collaborator.name.charAt(0).toUpperCase()}
            </div>
          )}
          {editing && (
            <label className="btn ghost" style={{ display: 'block', marginTop: '0.5rem', textAlign: 'center', cursor: 'pointer' }}>
              Change photo
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleProfileImageChange(e.target.files[0])}
              />
            </label>
          )}
        </div>

        <div style={{ flex: 1, minWidth: '260px' }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Name"
                style={inputStyle}
              />
              <input
                value={draft.instagramHandle ?? ''}
                onChange={(e) => setDraft({ ...draft, instagramHandle: e.target.value })}
                placeholder="Instagram handle"
                style={inputStyle}
              />
              <textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="What do they do?"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={draft.isCentral ?? false}
                  onChange={(e) => setDraft({ ...draft, isCentral: e.target.checked })}
                />
                This is Musas Sonideras — the network's central node
              </label>
              <div>
                <label style={{ fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>First seen</label>
                <input
                  type="date"
                  value={draft.firstSeenDate ?? ''}
                  onChange={(e) => setDraft({ ...draft, firstSeenDate: e.target.value || undefined })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>Tags</label>
                <TagMultiSelect
                  allTags={tags}
                  selectedIds={draft.tagIds}
                  onChange={(ids) => setDraft({ ...draft, tagIds: ids })}
                  onCreateTag={createTag}
                />
              </div>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Research notes…"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn" onClick={handleSave}>
                  Save
                </button>
                <button
                  className="btn ghost"
                  onClick={() => {
                    setDraft(collaborator);
                    setEditing(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 style={{ marginBottom: '0.2rem' }}>{collaborator.name}</h1>
              {collaborator.isCentral && (
                <div
                  style={{
                    display: 'inline-block',
                    fontSize: '0.72rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--color-primary)',
                    border: '1px solid var(--color-primary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.1em 0.5em',
                    marginBottom: '0.4rem',
                  }}
                >
                  Central node
                </div>
              )}
              {collaborator.instagramHandle && (
                <div style={{ color: 'var(--color-accent-2)', marginBottom: '0.5rem' }}>
                  @{collaborator.instagramHandle}
                </div>
              )}
              <p>{collaborator.description || <em style={{ color: 'var(--color-text-muted)' }}>No description yet.</em>}</p>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
                {collaborator.tagIds.map((tid) => tagById.get(tid)).filter((t): t is NonNullable<typeof t> => Boolean(t)).map((tag) => (
                  <TagChip key={tag.id} tag={tag} />
                ))}
              </div>
              {collaborator.firstSeenDate && (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  First seen: {collaborator.firstSeenDate}
                </div>
              )}
              {collaborator.notes && (
                <p style={{ marginTop: '0.75rem', whiteSpace: 'pre-wrap' }}>{collaborator.notes}</p>
              )}
              <div className="no-print" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
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
      </div>

      <div className="card no-print">
        <h2>Where they've appeared</h2>
        <MiniMap places={myPlaces} />
      </div>

      <div className="card">
        <h2>Posts ({posts.length})</h2>
        {posts.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No posts yet.</p>}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {posts.map((post) => (
            <div key={post.id} style={{ width: '110px' }}>
              {post.imageIds[0] && (
                <StoredImageView
                  imageId={post.imageIds[0]}
                  alt={post.postDate}
                  style={{
                    width: '110px',
                    height: '140px',
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                />
              )}
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                {post.postDate}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Events ({events.length})</h2>
        {events.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No events yet.</p>}
        <ul>
          {events.map((ev) => (
            <li key={ev.id}>
              <Link to={`/events/${ev.id}`}>{ev.name}</Link> — {ev.startDate}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Connections ({connections.length})</h2>
        {connections.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No connections yet.</p>}
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.2rem' }}>
          {connections.map((conn) => {
            const partnerId = conn.collaboratorAId === id ? conn.collaboratorBId : conn.collaboratorAId;
            const partner = collaboratorById.get(partnerId);
            return (
              <li key={conn.id}>
                <Link to={`/collaborators/${partnerId}`}>{partner?.name ?? 'Unknown'}</Link>{' '}
                {conn.type === 'co-tagged' ? (
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    — co-tagged in {conn.postIds.length} post{conn.postIds.length === 1 ? '' : 's'}
                  </span>
                ) : (
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    — {conn.label || 'manual connection'}
                    {conn.note ? `: ${conn.note}` : ''}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
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
