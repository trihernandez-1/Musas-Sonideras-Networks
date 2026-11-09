import type { Collaborator, Place, Post, Tag } from '../types/models';
import ImageDropzone from './ImageDropzone';
import StoredImageView from './StoredImageView';
import CollaboratorMultiSelect from './CollaboratorMultiSelect';
import TagMultiSelect from './TagMultiSelect';
import PlacePicker from './PlacePicker';
import RichTextEditor from './RichTextEditor';

export type PostFormValue = Pick<
  Post,
  | 'name'
  | 'postDate'
  | 'endDate'
  | 'postUrl'
  | 'captionNotes'
  | 'interpretation'
  | 'collaboratorIds'
  | 'collaboratorRoles'
  | 'placeId'
  | 'tagIds'
  | 'themeIds'
> & { files: File[] };

/** The full set of fields a record can carry, shared between the Inbox's "Add a post" form
 * and a record's own edit screen — a quick screenshot and a named multi-day gathering are
 * the same kind of record, just with different fields filled in. */
export default function PostForm({
  value,
  onChange,
  collaborators,
  onCreateCollaborator,
  places,
  onPlaceCreated,
  tags,
  onCreateTag,
  themes,
  onCreateTheme,
  existingImageIds,
  onRemoveExistingImage,
}: {
  value: PostFormValue;
  onChange: (patch: Partial<PostFormValue>) => void;
  collaborators: Collaborator[];
  onCreateCollaborator: (handle: string) => Promise<Collaborator>;
  places: Place[];
  onPlaceCreated: (place: Place) => void;
  tags: Tag[];
  onCreateTag: (label: string) => Promise<Tag>;
  themes: Tag[];
  onCreateTheme: (label: string) => Promise<Tag>;
  /** Screenshots already saved on this record (editing an existing one) — shown separately
   * from `value.files`, which are new, not-yet-uploaded screenshots. */
  existingImageIds?: string[];
  onRemoveExistingImage?: (imageId: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <Label>Screenshots (optional)</Label>
        {existingImageIds && existingImageIds.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {existingImageIds.map((imgId) => (
              <div key={imgId} style={{ position: 'relative' }}>
                <StoredImageView
                  imageId={imgId}
                  alt="Screenshot"
                  style={{ width: '110px', height: '140px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                />
                {onRemoveExistingImage && (
                  <button
                    type="button"
                    onClick={() => onRemoveExistingImage(imgId)}
                    aria-label="Remove screenshot"
                    className="btn danger"
                    style={{ position: 'absolute', top: '-8px', right: '-8px', width: '26px', height: '26px', padding: 0, borderRadius: '50%', lineHeight: 1 }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <ImageDropzone files={value.files} onChange={(files) => onChange({ files })} />
      </div>

      <div className="card">
        <Label>Name (optional)</Label>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: 0, marginBottom: '0.6rem' }}>
          Give it a title if this is a named occasion (e.g. a gathering) rather than an ordinary screenshot.
        </p>
        <input
          value={value.name ?? ''}
          onChange={(e) => onChange({ name: e.target.value || undefined })}
          placeholder="e.g. Baile Sonidero de Primavera"
          style={inputStyle}
        />
      </div>

      <div className="card" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr 2fr' }}>
        <div>
          <Label>Date</Label>
          <input type="date" required value={value.postDate} onChange={(e) => onChange({ postDate: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <Label>End date (optional)</Label>
          <input
            type="date"
            value={value.endDate ?? ''}
            onChange={(e) => onChange({ endDate: e.target.value || undefined })}
            style={inputStyle}
          />
        </div>
        <div>
          <Label>Post link (optional)</Label>
          <input
            type="url"
            placeholder="https://instagram.com/p/…"
            value={value.postUrl ?? ''}
            onChange={(e) => onChange({ postUrl: e.target.value })}
            style={inputStyle}
          />
        </div>
      </div>

      <div className="card">
        <Label>Collaborators (optional)</Label>
        <CollaboratorMultiSelect
          allCollaborators={collaborators}
          selectedIds={value.collaboratorIds}
          onChange={(ids) => onChange({ collaboratorIds: ids })}
          onCreateCollaborator={onCreateCollaborator}
        />
      </div>

      {value.collaboratorIds.length > 0 && (
        <div className="card">
          <Label>Who did what (optional)</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {value.collaboratorIds.map((cid) => (
              <div key={cid} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem' }}>{collaborators.find((c) => c.id === cid)?.name ?? 'Unknown'}</span>
                <input
                  value={value.collaboratorRoles?.[cid] ?? ''}
                  onChange={(e) => onChange({ collaboratorRoles: { ...value.collaboratorRoles, [cid]: e.target.value } })}
                  placeholder="Role, e.g. DJ, Venue, Designer…"
                  style={{ ...inputStyle, padding: '0.35rem 0.6rem' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <Label>Location (optional)</Label>
        <PlacePicker
          allPlaces={places}
          selectedId={value.placeId}
          onChange={(id) => onChange({ placeId: id })}
          onPlaceCreated={onPlaceCreated}
          allTags={tags}
          onCreateTag={onCreateTag}
        />
      </div>

      <div className="card">
        <Label>Caption notes</Label>
        <textarea
          value={value.captionNotes}
          onChange={(e) => onChange({ captionNotes: e.target.value })}
          placeholder="Transcribe or summarize the caption, hashtags, a description of what happened, etc."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      <div className="card">
        <Label>Your interpretation</Label>
        <RichTextEditor
          value={value.interpretation}
          onChange={(html) => onChange({ interpretation: html })}
          placeholder="What does this tell you about the network, the moment, the collaboration?"
        />
      </div>

      <div className="card">
        <Label>Tags</Label>
        <TagMultiSelect allTags={tags} selectedIds={value.tagIds} onChange={(ids) => onChange({ tagIds: ids })} onCreateTag={onCreateTag} />
      </div>

      <div className="card">
        <Label>Themes</Label>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: 0, marginBottom: '0.6rem' }}>
          Your own codes for thematic analysis — a separate list from Tags above, filterable in the Gallery.
        </p>
        <TagMultiSelect
          allTags={themes}
          selectedIds={value.themeIds}
          onChange={(ids) => onChange({ themeIds: ids })}
          onCreateTag={onCreateTheme}
          placeholder="Type to search or create a theme…"
        />
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.4rem' }}>{children}</label>;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '0.5rem 0.75rem',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
};
