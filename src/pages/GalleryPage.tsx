import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Collaborator, EventRecord, Place, Post } from '../types/models';
import { deleteEvent, deletePost, getAllCollaborators, getAllEvents, getAllPlaces, getAllPosts } from '../db/repos';
import { useTags } from '../hooks/useTags';
import { usePostThemes } from '../hooks/usePostThemes';
import TagChip from '../components/TagChip';
import StoredImageView from '../components/StoredImageView';
import PostLightbox from '../components/PostLightbox';

type GalleryItem =
  | { kind: 'post'; date: string; post: Post }
  | { kind: 'event'; date: string; event: EventRecord; thumbnailImageId?: string };

export default function GalleryPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const { tags } = useTags();
  const { themes } = usePostThemes();

  const [tagFilterIds, setTagFilterIds] = useState<string[]>([]);
  const [themeFilterIds, setThemeFilterIds] = useState<string[]>([]);
  const [collaboratorFilterId, setCollaboratorFilterId] = useState('');
  const [placeFilterId, setPlaceFilterId] = useState('');
  const [openPostId, setOpenPostId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [p, e, pl, c] = await Promise.all([getAllPosts(), getAllEvents(), getAllPlaces(), getAllCollaborators()]);
    setPosts(p);
    setEvents(e);
    setPlaces(pl);
    setCollaborators(c);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDeletePost(id: string) {
    if (!confirm('Delete this post? Its screenshots and interpretation will be permanently removed.')) return;
    if (openPostId === id) setOpenPostId(null);
    await deletePost(id);
    await refresh();
  }

  async function handleDeleteEvent(id: string, name: string) {
    if (!confirm(`Delete "${name}"? Posts linked to it keep their records but lose this link.`)) return;
    await deleteEvent(id);
    await refresh();
  }

  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);
  const themeById = useMemo(() => new Map(themes.map((t) => [t.id, t])), [themes]);
  const collaboratorById = useMemo(() => new Map(collaborators.map((c) => [c.id, c])), [collaborators]);
  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  const items: GalleryItem[] = useMemo(() => {
    const postItems: GalleryItem[] = posts.map((post) => ({ kind: 'post', date: post.postDate, post }));
    const eventItems: GalleryItem[] = events.map((event) => {
      const linkedPost = posts.find((p) => p.eventId === event.id && p.imageIds.length > 0);
      return { kind: 'event', date: event.startDate, event, thumbnailImageId: linkedPost?.imageIds[0] };
    });
    return [...postItems, ...eventItems].sort((a, b) => b.date.localeCompare(a.date));
  }, [posts, events]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const tagIds = item.kind === 'post' ? item.post.tagIds : item.event.tagIds;
      const collaboratorIds = item.kind === 'post' ? item.post.collaboratorIds : item.event.collaboratorIds;
      if (tagFilterIds.length > 0 && !tagFilterIds.some((tid) => tagIds.includes(tid))) return false;
      if (themeFilterIds.length > 0) {
        const themeIds = item.kind === 'post' ? (item.post.themeIds ?? []) : [];
        if (!themeFilterIds.some((tid) => themeIds.includes(tid))) return false;
      }
      if (collaboratorFilterId && !collaboratorIds.includes(collaboratorFilterId)) return false;
      if (placeFilterId) {
        const placeId =
          item.kind === 'event'
            ? item.event.placeId
            : item.post.placeId ?? (item.post.eventId ? eventById.get(item.post.eventId)?.placeId : undefined);
        if (placeId !== placeFilterId) return false;
      }
      return true;
    });
  }, [items, tagFilterIds, themeFilterIds, collaboratorFilterId, placeFilterId, eventById]);

  function toggleTagFilter(id: string) {
    setTagFilterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleThemeFilter(id: string) {
    setThemeFilterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const openPost = openPostId ? posts.find((p) => p.id === openPostId) ?? null : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h1>Gallery</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Every post and event, newest first, with your interpretation underneath.
        </p>

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <FieldLabel>Filter by tag</FieldLabel>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', maxWidth: '320px' }}>
              {tags.map((tag) => (
                <span key={tag.id} onClick={() => toggleTagFilter(tag.id)} style={{ cursor: 'pointer', opacity: tagFilterIds.length === 0 || tagFilterIds.includes(tag.id) ? 1 : 0.4 }}>
                  <TagChip tag={tag} size="sm" />
                </span>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Filter by theme</FieldLabel>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', maxWidth: '320px' }}>
              {themes.length === 0 && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No themes yet</span>}
              {themes.map((theme) => (
                <span key={theme.id} onClick={() => toggleThemeFilter(theme.id)} style={{ cursor: 'pointer', opacity: themeFilterIds.length === 0 || themeFilterIds.includes(theme.id) ? 1 : 0.4 }}>
                  <TagChip tag={theme} size="sm" />
                </span>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Collaborator</FieldLabel>
            <select value={collaboratorFilterId} onChange={(e) => setCollaboratorFilterId(e.target.value)} style={selectStyle}>
              <option value="">Everyone</option>
              {[...collaborators].sort((a, b) => a.name.localeCompare(b.name, 'es')).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Place</FieldLabel>
            <select value={placeFilterId} onChange={(e) => setPlaceFilterId(e.target.value)} style={selectStyle}>
              <option value="">Anywhere</option>
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {filtered.map((item) => (
          <GalleryCard
            key={item.kind === 'post' ? `post-${item.post.id}` : `event-${item.event.id}`}
            item={item}
            tagById={tagById}
            themeById={themeById}
            placeById={placeById}
            onOpenPost={(id) => setOpenPostId(id)}
            onDeletePost={handleDeletePost}
            onDeleteEvent={handleDeleteEvent}
          />
        ))}
        {filtered.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>Nothing matches these filters yet.</p>}
      </div>

      {openPost && (
        <PostLightbox
          post={openPost}
          collaboratorById={collaboratorById}
          tagById={tagById}
          themeById={themeById}
          eventName={openPost.eventId ? eventById.get(openPost.eventId)?.name : undefined}
          placeName={openPost.placeId ? placeById.get(openPost.placeId)?.name : undefined}
          onClose={() => setOpenPostId(null)}
        />
      )}
    </div>
  );
}

function GalleryCard({
  item,
  tagById,
  themeById,
  placeById,
  onOpenPost,
  onDeletePost,
  onDeleteEvent,
}: {
  item: GalleryItem;
  tagById: Map<string, { id: string; label: string; color?: string }>;
  themeById: Map<string, { id: string; label: string; color?: string }>;
  placeById: Map<string, Place>;
  onOpenPost: (id: string) => void;
  onDeletePost: (id: string) => void;
  onDeleteEvent: (id: string, name: string) => void;
}) {
  const tagIds = item.kind === 'post' ? item.post.tagIds : item.event.tagIds;
  const tagList = tagIds.map((id) => tagById.get(id)).filter((t): t is NonNullable<typeof t> => Boolean(t));
  const themeIds = item.kind === 'post' ? item.post.themeIds ?? [] : [];
  const themeList = themeIds.map((id) => themeById.get(id)).filter((t): t is NonNullable<typeof t> => Boolean(t));
  const interpretation = item.kind === 'post' ? item.post.interpretation : item.event.interpretation;
  const imageId = item.kind === 'post' ? item.post.imageIds[0] : item.thumbnailImageId;

  const body = (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', cursor: 'pointer', position: 'relative' }}>
      <button
        type="button"
        aria-label={item.kind === 'post' ? 'Delete post' : 'Delete event'}
        className="btn danger"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (item.kind === 'post') onDeletePost(item.post.id);
          else onDeleteEvent(item.event.id, item.event.name);
        }}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '26px',
          height: '26px',
          padding: 0,
          borderRadius: '50%',
          lineHeight: 1,
          zIndex: 2,
          background: 'var(--color-surface-raised)',
        }}
      >
        ×
      </button>
      {imageId ? (
        <StoredImageView imageId={imageId} alt={item.date} style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '220px', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', padding: '1rem', textAlign: 'center' }}>
          {item.kind === 'event' ? item.event.name : 'No screenshot'}
        </div>
      )}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
        <div style={{ fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
          {item.date} · {item.kind === 'event' ? 'Event' : 'Post'}
          {item.kind === 'event' && item.event.placeId && <> · {placeById.get(item.event.placeId)?.name}</>}
        </div>
        {item.kind === 'event' && <div style={{ fontWeight: 600 }}>{item.event.name}</div>}
        {interpretation && (
          <div
            style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}
            dangerouslySetInnerHTML={{ __html: interpretation }}
          />
        )}
        {(tagList.length > 0 || themeList.length > 0) && (
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: 'auto' }}>
            {tagList.map((tag) => (
              <TagChip key={tag.id} tag={tag} size="sm" />
            ))}
            {themeList.map((theme) => (
              <TagChip key={theme.id} tag={theme} size="sm" />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (item.kind === 'event') {
    return (
      <Link to={`/events/${item.event.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        {body}
      </Link>
    );
  }
  return (
    <div onClick={() => onOpenPost(item.post.id)} role="button" tabIndex={0}>
      {body}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>{children}</div>;
}

const selectStyle: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '0.45rem 0.6rem',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
};
