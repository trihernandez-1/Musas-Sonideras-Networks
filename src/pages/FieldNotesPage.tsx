import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Collaborator, EventRecord, FieldNote, Place, Post } from '../types/models';
import {
  deleteFieldNote,
  getAllCollaborators,
  getAllEvents,
  getAllFieldNotes,
  getAllPlaces,
  getAllPosts,
  quickCreateCollaborator,
  upsertFieldNote,
} from '../db/repos';
import RichTextEditor from '../components/RichTextEditor';
import CollaboratorMultiSelect from '../components/CollaboratorMultiSelect';
import EntityMultiSelect from '../components/EntityMultiSelect';

const EMPTY_FORM = {
  title: '',
  body: '',
  linkedCollaboratorIds: [] as string[],
  linkedPostIds: [] as string[],
  linkedEventIds: [] as string[],
  linkedPlaceIds: [] as string[],
};

export default function FieldNotesPage() {
  const [notes, setNotes] = useState<FieldNote[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const load = useCallback(async () => {
    const [n, c, p, e, pl] = await Promise.all([
      getAllFieldNotes(),
      getAllCollaborators(),
      getAllPosts(),
      getAllEvents(),
      getAllPlaces(),
    ]);
    n.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setNotes(n);
    setCollaborators(c);
    setPosts(p);
    setEvents(e);
    setPlaces(pl);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const collaboratorById = useMemo(() => new Map(collaborators.map((c) => [c.id, c])), [collaborators]);
  const postById = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);
  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  const postOptions = useMemo(() => posts.map((p) => ({ id: p.id, label: `Post — ${p.postDate}`, sublabel: p.captionNotes.slice(0, 40) })), [posts]);
  const eventOptions = useMemo(() => events.map((e) => ({ id: e.id, label: e.name, sublabel: e.startDate })), [events]);
  const placeOptions = useMemo(() => places.map((p) => ({ id: p.id, label: p.name, sublabel: p.address })), [places]);

  function update<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startNew() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setComposing(true);
  }

  function startEdit(note: FieldNote) {
    setForm({
      title: note.title,
      body: note.body,
      linkedCollaboratorIds: note.linkedCollaboratorIds,
      linkedPostIds: note.linkedPostIds,
      linkedEventIds: note.linkedEventIds,
      linkedPlaceIds: note.linkedPlaceIds,
    });
    setEditingId(note.id);
    setComposing(true);
  }

  async function handleSave() {
    if (!form.title.trim() && !form.body.trim()) return;
    await upsertFieldNote({ id: editingId ?? undefined, ...form });
    setComposing(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this field note?')) return;
    await deleteFieldNote(id);
    await load();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h1>Field Notes</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Free-form notes and memos. Link any note to the collaborators, posts, events, or places it's about.
        </p>
        {!composing && (
          <button type="button" className="btn" onClick={startNew}>
            + New note
          </button>
        )}
      </div>

      {composing && (
        <div className="card">
          <h2>{editingId ? 'Edit note' : 'New note'}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Title"
              style={inputStyle}
            />
            <RichTextEditor value={form.body} onChange={(html) => update('body', html)} placeholder="Write your note…" />
            <div>
              <FieldLabel>Linked collaborators</FieldLabel>
              <CollaboratorMultiSelect
                allCollaborators={collaborators}
                selectedIds={form.linkedCollaboratorIds}
                onChange={(ids) => update('linkedCollaboratorIds', ids)}
                onCreateCollaborator={async (handle) => {
                  const c = await quickCreateCollaborator(handle);
                  setCollaborators((prev) => [...prev, c]);
                  return c;
                }}
              />
            </div>
            <div>
              <FieldLabel>Linked posts</FieldLabel>
              <EntityMultiSelect options={postOptions} selectedIds={form.linkedPostIds} onChange={(ids) => update('linkedPostIds', ids)} placeholder="Search posts by date or caption…" />
            </div>
            <div>
              <FieldLabel>Linked events</FieldLabel>
              <EntityMultiSelect options={eventOptions} selectedIds={form.linkedEventIds} onChange={(ids) => update('linkedEventIds', ids)} placeholder="Search events…" />
            </div>
            <div>
              <FieldLabel>Linked places</FieldLabel>
              <EntityMultiSelect options={placeOptions} selectedIds={form.linkedPlaceIds} onChange={(ids) => update('linkedPlaceIds', ids)} placeholder="Search places…" />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn" onClick={handleSave}>
                Save
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setComposing(false);
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {notes.length === 0 && !composing && <p style={{ color: 'var(--color-text-muted)' }}>No field notes yet.</p>}
        {notes.map((note) => (
          <div key={note.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ marginBottom: '0.2rem' }}>{note.title || <em>Untitled note</em>}</h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  {new Date(note.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button type="button" className="btn ghost" style={{ padding: '0.2em 0.6em', fontSize: '0.8rem' }} onClick={() => startEdit(note)}>
                  Edit
                </button>
                <button type="button" className="btn danger" style={{ padding: '0.2em 0.6em', fontSize: '0.8rem' }} onClick={() => handleDelete(note.id)}>
                  Delete
                </button>
              </div>
            </div>
            {note.body && <div style={{ marginTop: '0.6rem' }} dangerouslySetInnerHTML={{ __html: note.body }} />}
            {(note.linkedCollaboratorIds.length > 0 || note.linkedPostIds.length > 0 || note.linkedEventIds.length > 0 || note.linkedPlaceIds.length > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                {note.linkedCollaboratorIds.map((id) => (
                  <Link key={id} to={`/collaborators/${id}`}>
                    @{collaboratorById.get(id)?.name ?? '?'}
                  </Link>
                ))}
                {note.linkedEventIds.map((id) => (
                  <Link key={id} to={`/events/${id}`}>
                    {eventById.get(id)?.name ?? '?'}
                  </Link>
                ))}
                {note.linkedPostIds.map((id) => (
                  <span key={id} style={{ color: 'var(--color-text-muted)' }}>
                    Post {postById.get(id)?.postDate ?? '?'}
                  </span>
                ))}
                {note.linkedPlaceIds.map((id) => (
                  <span key={id} style={{ color: 'var(--color-text-muted)' }}>
                    📍 {placeById.get(id)?.name ?? '?'}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>{children}</div>;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '0.5rem 0.75rem',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
};
