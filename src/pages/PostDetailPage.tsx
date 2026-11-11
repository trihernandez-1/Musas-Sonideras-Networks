import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Collaborator, Place, Post } from '../types/models';
import {
  deleteImage,
  deletePost,
  getAllCollaborators,
  getAllKnownRoles,
  getAllPlaces,
  getPost,
  quickCreateCollaborator,
  saveImage,
  upsertPost,
} from '../db/repos';
import { useTags } from '../hooks/useTags';
import { usePostThemes } from '../hooks/usePostThemes';
import TagChip from '../components/TagChip';
import StoredImageView from '../components/StoredImageView';
import MiniMap from '../components/MiniMap';
import PostForm from '../components/PostForm';
import type { PostFormValue } from '../components/PostForm';
import { describeCleanup } from '../utils/describeCleanup';

function draftFromPost(post: Post): PostFormValue {
  return {
    files: [],
    name: post.name,
    postDate: post.postDate,
    endDate: post.endDate,
    postUrl: post.postUrl ?? '',
    captionNotes: post.captionNotes,
    interpretation: post.interpretation,
    collaboratorIds: post.collaboratorIds,
    collaboratorRoles: post.collaboratorRoles ?? {},
    placeId: post.placeId,
    tagIds: post.tagIds,
    themeIds: post.themeIds ?? [],
  };
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tags, createTag } = useTags();
  const { themes, createTheme } = usePostThemes();

  const [post, setPost] = useState<Post | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [knownRoles, setKnownRoles] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PostFormValue | null>(null);
  const [existingImageIds, setExistingImageIds] = useState<string[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [p, allPlaces, allCollaborators, allRoles] = await Promise.all([
      getPost(id),
      getAllPlaces(),
      getAllCollaborators(),
      getAllKnownRoles(),
    ]);
    setPost(p ?? null);
    if (p) {
      setDraft(draftFromPost(p));
      setExistingImageIds(p.imageIds);
      setRemovedImageIds([]);
    }
    setPlaces(allPlaces);
    setCollaborators(allCollaborators);
    setKnownRoles(allRoles);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);
  const themeById = useMemo(() => new Map(themes.map((t) => [t.id, t])), [themes]);
  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const collaboratorById = useMemo(() => new Map(collaborators.map((c) => [c.id, c])), [collaborators]);

  if (!post || !draft) {
    return <div className="card">Loading…</div>;
  }

  const place = post.placeId ? placeById.get(post.placeId) : undefined;
  const title = post.name || `Post — ${post.postDate}`;

  async function handleSave() {
    if (!post || !draft) return;
    setSaving(true);
    try {
      const newImages = await Promise.all(draft.files.map((file) => saveImage(file, file.name)));
      await Promise.all(removedImageIds.map((imgId) => deleteImage(imgId)));
      await upsertPost({
        id: post.id,
        name: draft.name?.trim() || undefined,
        imageIds: [...existingImageIds, ...newImages.map((img) => img.id)],
        postDate: draft.postDate,
        endDate: draft.endDate,
        postUrl: draft.postUrl?.trim() || undefined,
        captionNotes: draft.captionNotes,
        interpretation: draft.interpretation,
        collaboratorIds: draft.collaboratorIds,
        collaboratorRoles: draft.collaboratorRoles,
        placeId: draft.placeId,
        tagIds: draft.tagIds,
        themeIds: draft.themeIds,
      });
      setEditing(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!post) return;
    if (!confirm('Delete this record? Its screenshots and interpretation will be permanently removed.')) return;
    const summary = await deletePost(post.id);
    const cleanupNote = describeCleanup(summary);
    if (cleanupNote) alert(cleanupNote);
    navigate('/gallery');
  }

  return (
    <div className="print-target" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="no-print">
        <Link to="/gallery">&larr; Back to Gallery</Link>
      </div>

      <div className="card">
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <PostForm
              value={draft}
              onChange={(patch) => setDraft({ ...draft, ...patch })}
              collaborators={collaborators}
              onCreateCollaborator={async (handle) => {
                const c = await quickCreateCollaborator(handle);
                setCollaborators((prev) => [...prev, c]);
                return c;
              }}
              places={places}
              onPlaceCreated={(place) => setPlaces((prev) => [...prev, place])}
              tags={tags}
              onCreateTag={createTag}
              themes={themes}
              onCreateTheme={createTheme}
              existingImageIds={existingImageIds}
              onRemoveExistingImage={(imgId) => {
                setExistingImageIds((prev) => prev.filter((id) => id !== imgId));
                setRemovedImageIds((prev) => [...prev, imgId]);
              }}
              knownRoles={knownRoles}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  setDraft(draftFromPost(post));
                  setExistingImageIds(post.imageIds);
                  setRemovedImageIds([]);
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {post.imageIds.length > 0 && (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {post.imageIds.map((imgId) => (
                  <StoredImageView
                    key={imgId}
                    imageId={imgId}
                    alt={title}
                    style={{ width: '160px', height: '200px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                  />
                ))}
              </div>
            )}
            <h1>{title}</h1>
            <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              {post.postDate}
              {post.endDate && post.endDate !== post.postDate ? ` – ${post.endDate}` : ''}
              {place && <> · {place.name}</>}
            </div>
            {post.postUrl && (
              <div style={{ marginBottom: '0.5rem' }}>
                <a href={post.postUrl} target="_blank" rel="noreferrer noopener">
                  View original post
                </a>
              </div>
            )}
            {post.captionNotes && <p>{post.captionNotes}</p>}
            {post.interpretation && (
              <div dangerouslySetInnerHTML={{ __html: post.interpretation }} style={{ marginTop: '0.5rem' }} />
            )}
            {post.collaboratorIds.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <FieldLabel>Collaborators</FieldLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem' }}>
                  {post.collaboratorIds.map((cid) => {
                    const role = post.collaboratorRoles?.[cid];
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
            {(post.tagIds.length > 0 || (post.themeIds ?? []).length > 0) && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                {post.tagIds.map((tid) => tagById.get(tid)).filter((t): t is NonNullable<typeof t> => Boolean(t)).map((tag) => (
                  <TagChip key={tag.id} tag={tag} />
                ))}
                {(post.themeIds ?? []).map((tid) => themeById.get(tid)).filter((t): t is NonNullable<typeof t> => Boolean(t)).map((theme) => (
                  <TagChip key={theme.id} tag={theme} />
                ))}
              </div>
            )}
            <div className="no-print" style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button className="btn secondary" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button className="btn ghost" onClick={() => window.print()}>
                Print
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
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>{children}</div>;
}
