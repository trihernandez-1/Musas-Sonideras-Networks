import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Collaborator, Place, Post } from '../types/models';
import { deletePost, getAllCollaborators, getAllPlaces, getAllPosts } from '../db/repos';
import { useTags } from '../hooks/useTags';
import { usePostThemes } from '../hooks/usePostThemes';
import TagChip from '../components/TagChip';
import StoredImageView from '../components/StoredImageView';
import PostLightbox from '../components/PostLightbox';
import { describeCleanup } from '../utils/describeCleanup';

export default function GalleryPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const { tags, refresh: refreshTags } = useTags();
  const { themes, refresh: refreshThemes } = usePostThemes();

  const [tagFilterIds, setTagFilterIds] = useState<string[]>([]);
  const [themeFilterIds, setThemeFilterIds] = useState<string[]>([]);
  const [collaboratorFilterId, setCollaboratorFilterId] = useState('');
  const [placeFilterId, setPlaceFilterId] = useState('');
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [p, pl, c] = await Promise.all([getAllPosts(), getAllPlaces(), getAllCollaborators()]);
    setPosts(p);
    setPlaces(pl);
    setCollaborators(c);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDeletePost(id: string) {
    if (!confirm('Delete this record? Its screenshots and interpretation will be permanently removed.')) return;
    if (openPostId === id) setOpenPostId(null);
    const summary = await deletePost(id);
    await Promise.all([refresh(), refreshTags(), refreshThemes()]);
    setMessage(describeCleanup(summary) ?? 'Deleted.');
  }

  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);
  const themeById = useMemo(() => new Map(themes.map((t) => [t.id, t])), [themes]);
  const collaboratorById = useMemo(() => new Map(collaborators.map((c) => [c.id, c])), [collaborators]);
  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  const items = useMemo(() => [...posts].sort((a, b) => b.postDate.localeCompare(a.postDate)), [posts]);

  const filtered = useMemo(() => {
    return items.filter((post) => {
      if (tagFilterIds.length > 0 && !tagFilterIds.some((tid) => post.tagIds.includes(tid))) return false;
      if (themeFilterIds.length > 0 && !themeFilterIds.some((tid) => (post.themeIds ?? []).includes(tid))) return false;
      if (collaboratorFilterId && !post.collaboratorIds.includes(collaboratorFilterId)) return false;
      if (placeFilterId && post.placeId !== placeFilterId) return false;
      return true;
    });
  }, [items, tagFilterIds, themeFilterIds, collaboratorFilterId, placeFilterId]);

  function toggleTagFilter(id: string) {
    setTagFilterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleThemeFilter(id: string) {
    setThemeFilterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const openPost = openPostId ? posts.find((p) => p.id === openPostId) ?? null : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {message && (
        <div className="card" style={{ borderColor: 'var(--color-accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <span>{message}</span>
          <button type="button" className="btn ghost" style={{ padding: '0.15em 0.6em', flexShrink: 0 }} onClick={() => setMessage(null)}>
            Dismiss
          </button>
        </div>
      )}
      <div className="card">
        <h1>Gallery</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Every record, newest first, with your interpretation underneath.
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
        {filtered.map((post) => (
          <GalleryCard
            key={post.id}
            post={post}
            tagById={tagById}
            themeById={themeById}
            placeById={placeById}
            onOpen={(id) => setOpenPostId(id)}
            onDelete={handleDeletePost}
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
          placeName={openPost.placeId ? placeById.get(openPost.placeId)?.name : undefined}
          onClose={() => setOpenPostId(null)}
        />
      )}
    </div>
  );
}

function GalleryCard({
  post,
  tagById,
  themeById,
  placeById,
  onOpen,
  onDelete,
}: {
  post: Post;
  tagById: Map<string, { id: string; label: string; color?: string }>;
  themeById: Map<string, { id: string; label: string; color?: string }>;
  placeById: Map<string, Place>;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const tagList = post.tagIds.map((id) => tagById.get(id)).filter((t): t is NonNullable<typeof t> => Boolean(t));
  const themeList = (post.themeIds ?? []).map((id) => themeById.get(id)).filter((t): t is NonNullable<typeof t> => Boolean(t));
  const imageId = post.imageIds[0];

  return (
    <div onClick={() => onOpen(post.id)} role="button" tabIndex={0}>
      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', cursor: 'pointer', position: 'relative' }}>
        <button
          type="button"
          aria-label="Delete record"
          className="btn danger"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(post.id);
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
          <StoredImageView imageId={imageId} alt={post.name ?? post.postDate} style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '220px', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', padding: '1rem', textAlign: 'center' }}>
            {post.name || 'No screenshot'}
          </div>
        )}
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
            {post.postDate}
            {post.placeId && <> · {placeById.get(post.placeId)?.name}</>}
          </div>
          {post.name && <div style={{ fontWeight: 600 }}>{post.name}</div>}
          {post.interpretation && (
            <div
              style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}
              dangerouslySetInnerHTML={{ __html: post.interpretation }}
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
