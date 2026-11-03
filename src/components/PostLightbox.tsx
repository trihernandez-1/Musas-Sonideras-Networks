import type { Collaborator, Post, Tag } from '../types/models';
import { Link } from 'react-router-dom';
import StoredImageView from './StoredImageView';
import TagChip from './TagChip';

export default function PostLightbox({
  post,
  collaboratorById,
  tagById,
  eventName,
  onClose,
}: {
  post: Post;
  collaboratorById: Map<string, Collaborator>;
  tagById: Map<string, Tag>;
  eventName?: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(20, 16, 17, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '2rem' }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: '900px', width: '100%', maxHeight: '90vh', overflowY: 'auto', display: 'grid', gridTemplateColumns: post.imageIds.length > 0 ? '1fr 1fr' : '1fr', gap: '1.5rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        {post.imageIds.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {post.imageIds.map((imgId) => (
              <StoredImageView key={imgId} imageId={imgId} alt={post.postDate} style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
            ))}
          </div>
        )}
        <div>
          <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
            {post.postDate}
            {eventName && <> · {eventName}</>}
          </div>
          {post.postUrl && (
            <div style={{ marginBottom: '0.5rem' }}>
              <a href={post.postUrl} target="_blank" rel="noreferrer noopener">
                View original post
              </a>
            </div>
          )}
          {post.captionNotes && (
            <div style={{ marginBottom: '1rem' }}>
              <FieldLabel>Caption notes</FieldLabel>
              <p style={{ whiteSpace: 'pre-wrap' }}>{post.captionNotes}</p>
            </div>
          )}
          {post.interpretation && (
            <div style={{ marginBottom: '1rem' }}>
              <FieldLabel>Interpretation</FieldLabel>
              <div dangerouslySetInnerHTML={{ __html: post.interpretation }} />
            </div>
          )}
          {post.collaboratorIds.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <FieldLabel>Collaborators</FieldLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {post.collaboratorIds.map((cid) => (
                  <Link key={cid} to={`/collaborators/${cid}`}>
                    {collaboratorById.get(cid)?.name ?? 'Unknown'}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {post.tagIds.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {post.tagIds.map((tid) => tagById.get(tid)).filter((t): t is Tag => Boolean(t)).map((tag) => (
                <TagChip key={tag.id} tag={tag} />
              ))}
            </div>
          )}
          <button type="button" className="btn ghost" style={{ marginTop: '1.25rem' }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>{children}</div>;
}
