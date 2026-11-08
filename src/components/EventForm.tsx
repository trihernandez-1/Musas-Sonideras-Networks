import type { Collaborator, EventRecord, Place, Tag } from '../types/models';
import CollaboratorMultiSelect from './CollaboratorMultiSelect';
import TagMultiSelect from './TagMultiSelect';
import PlacePicker from './PlacePicker';
import RichTextEditor from './RichTextEditor';

export type EventFormValue = Pick<
  EventRecord,
  'name' | 'startDate' | 'endDate' | 'placeId' | 'description' | 'interpretation' | 'collaboratorIds' | 'collaboratorRoles' | 'tagIds'
>;

/** The full set of event fields, shared between creating a new event (Inbox) and editing an
 * existing one (the event's own page) — the same fields, the same pickers, either place. */
export default function EventForm({
  value,
  onChange,
  places,
  onPlaceCreated,
  collaborators,
  onCreateCollaborator,
  tags,
  onCreateTag,
}: {
  value: EventFormValue;
  onChange: (patch: Partial<EventFormValue>) => void;
  places: Place[];
  onPlaceCreated: (place: Place) => void;
  collaborators: Collaborator[];
  onCreateCollaborator: (handle: string) => Promise<Collaborator>;
  tags: Tag[];
  onCreateTag: (label: string) => Promise<Tag>;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div>
        <FieldLabel>Event name</FieldLabel>
        <input
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Baile Sonidero de Primavera"
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <FieldLabel>Start date</FieldLabel>
          <input
            type="date"
            value={value.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <FieldLabel>End date (optional)</FieldLabel>
          <input
            type="date"
            value={value.endDate ?? ''}
            onChange={(e) => onChange({ endDate: e.target.value || undefined })}
            style={inputStyle}
          />
        </div>
      </div>
      <div>
        <FieldLabel>Place (optional)</FieldLabel>
        <PlacePicker
          allPlaces={places}
          selectedId={value.placeId}
          onChange={(id) => onChange({ placeId: id })}
          onPlaceCreated={onPlaceCreated}
          allTags={tags}
          onCreateTag={onCreateTag}
        />
      </div>
      <div>
        <FieldLabel>Description (optional)</FieldLabel>
        <textarea
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>
      <div>
        <FieldLabel>Your interpretation (optional)</FieldLabel>
        <RichTextEditor
          value={value.interpretation}
          onChange={(html) => onChange({ interpretation: html })}
          placeholder="What does this event tell you about the network, the moment, the collaboration?"
        />
      </div>
      <div>
        <FieldLabel>Collaborators (optional)</FieldLabel>
        <CollaboratorMultiSelect
          allCollaborators={collaborators}
          selectedIds={value.collaboratorIds}
          onChange={(ids) => onChange({ collaboratorIds: ids })}
          onCreateCollaborator={onCreateCollaborator}
        />
      </div>
      {value.collaboratorIds.length > 0 && (
        <div>
          <FieldLabel>Who did what (optional)</FieldLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {value.collaboratorIds.map((cid) => (
              <div key={cid} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem' }}>
                  {collaborators.find((c) => c.id === cid)?.name ?? 'Unknown'}
                </span>
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
      <div>
        <FieldLabel>Tags (optional)</FieldLabel>
        <TagMultiSelect allTags={tags} selectedIds={value.tagIds} onChange={(ids) => onChange({ tagIds: ids })} onCreateTag={onCreateTag} />
      </div>
    </div>
  );
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
  padding: '0.5rem 0.75rem',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
};
