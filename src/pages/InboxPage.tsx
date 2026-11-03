import { useCallback, useEffect, useState } from 'react';
import type { Collaborator, EventRecord, Place } from '../types/models';
import {
  getAllCollaborators,
  getAllEvents,
  getAllPlaces,
  quickCreateCollaborator,
  saveImage,
  upsertEvent,
  upsertPost,
} from '../db/repos';
import { useTags } from '../hooks/useTags';
import { usePostThemes } from '../hooks/usePostThemes';
import ImageDropzone from '../components/ImageDropzone';
import CollaboratorMultiSelect from '../components/CollaboratorMultiSelect';
import TagMultiSelect from '../components/TagMultiSelect';
import EventPicker from '../components/EventPicker';
import PlacePicker from '../components/PlacePicker';
import RichTextEditor from '../components/RichTextEditor';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM = {
  files: [] as File[],
  postDate: todayISO(),
  postUrl: '',
  captionNotes: '',
  interpretation: '',
  collaboratorIds: [] as string[],
  eventId: undefined as string | undefined,
  placeId: undefined as string | undefined,
  tagIds: [] as string[],
  themeIds: [] as string[],
};

export default function InboxPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const { tags, createTag } = useTags();
  const { themes, createTheme } = usePostThemes();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshCollaborators = useCallback(async () => {
    const all = await getAllCollaborators();
    all.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    setCollaborators(all);
  }, []);

  const refreshEvents = useCallback(async () => {
    const all = await getAllEvents();
    all.sort((a, b) => b.startDate.localeCompare(a.startDate));
    setEvents(all);
  }, []);

  const refreshPlaces = useCallback(async () => {
    const all = await getAllPlaces();
    all.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    setPlaces(all);
  }, []);

  useEffect(() => {
    refreshCollaborators();
    refreshEvents();
    refreshPlaces();
  }, [refreshCollaborators, refreshEvents, refreshPlaces]);

  function update<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreateCollaborator(handle: string) {
    const c = await quickCreateCollaborator(handle);
    await refreshCollaborators();
    return c;
  }

  async function handleCreateEvent(name: string) {
    const ev = await upsertEvent({
      name,
      startDate: form.postDate,
      placeId: form.placeId,
      description: '',
      interpretation: '',
      postIds: [],
      collaboratorIds: form.collaboratorIds,
      tagIds: [],
    });
    await refreshEvents();
    return ev;
  }

  function resetForNextPost() {
    setForm({ ...EMPTY_FORM, postDate: form.postDate });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.files.length === 0) {
      setMessage('Add at least one screenshot before saving.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const images = await Promise.all(form.files.map((file) => saveImage(file, file.name)));
      await upsertPost({
        imageIds: images.map((img) => img.id),
        postDate: form.postDate,
        postUrl: form.postUrl.trim() || undefined,
        captionNotes: form.captionNotes,
        interpretation: form.interpretation,
        collaboratorIds: form.collaboratorIds,
        eventId: form.eventId,
        placeId: form.placeId,
        tagIds: form.tagIds,
        themeIds: form.themeIds,
      });
      setMessage('Post saved. Add another?');
      resetForNextPost();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h1>Add a post</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Drop or paste screenshots, tag who's in it, and jot your read on it. Only a screenshot
          and a date are required — everything else you can fill in later.
        </p>
      </div>

      {message && (
        <div className="card" style={{ borderColor: 'var(--color-accent)' }}>
          {message}
        </div>
      )}

      <div className="card">
        <Label>Screenshots</Label>
        <ImageDropzone files={form.files} onChange={(files) => update('files', files)} />
      </div>

      <div className="card" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 2fr' }}>
        <div>
          <Label>Post date</Label>
          <input
            type="date"
            required
            value={form.postDate}
            onChange={(e) => update('postDate', e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <Label>Post link (optional)</Label>
          <input
            type="url"
            placeholder="https://instagram.com/p/…"
            value={form.postUrl}
            onChange={(e) => update('postUrl', e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div className="card">
        <Label>Tagged collaborators</Label>
        <CollaboratorMultiSelect
          allCollaborators={collaborators}
          selectedIds={form.collaboratorIds}
          onChange={(ids) => update('collaboratorIds', ids)}
          onCreateCollaborator={handleCreateCollaborator}
        />
      </div>

      <div className="card">
        <Label>Linked event (optional)</Label>
        <EventPicker
          allEvents={events}
          selectedId={form.eventId}
          onChange={(id) => update('eventId', id)}
          onCreateEvent={handleCreateEvent}
        />
      </div>

      <div className="card">
        <Label>Location (optional)</Label>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: 0, marginBottom: '0.6rem' }}>
          Where this post happened, if that's relevant — it'll show up as a pin on the Map.
          Separate from the linked event above, since not every post belongs to one.
        </p>
        <PlacePicker
          allPlaces={places}
          selectedId={form.placeId}
          onChange={(id) => update('placeId', id)}
          onPlaceCreated={(place) => setPlaces((prev) => [...prev, place].sort((a, b) => a.name.localeCompare(b.name, 'es')))}
          allTags={tags}
          onCreateTag={createTag}
        />
      </div>

      <div className="card">
        <Label>Caption notes</Label>
        <textarea
          value={form.captionNotes}
          onChange={(e) => update('captionNotes', e.target.value)}
          placeholder="Transcribe or summarize the caption, hashtags, etc."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      <div className="card">
        <Label>Your interpretation</Label>
        <RichTextEditor
          value={form.interpretation}
          onChange={(html) => update('interpretation', html)}
          placeholder="What does this post tell you about the network, the moment, the collaboration?"
        />
      </div>

      <div className="card">
        <Label>Tags</Label>
        <TagMultiSelect
          allTags={tags}
          selectedIds={form.tagIds}
          onChange={(ids) => update('tagIds', ids)}
          onCreateTag={createTag}
        />
      </div>

      <div className="card">
        <Label>Themes</Label>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: 0, marginBottom: '0.6rem' }}>
          Your own codes for thematic analysis — a separate list from Tags above, filterable in
          the Gallery.
        </p>
        <TagMultiSelect
          allTags={themes}
          selectedIds={form.themeIds}
          onChange={(ids) => update('themeIds', ids)}
          onCreateTag={createTheme}
          placeholder="Type to search or create a theme…"
        />
      </div>

      <div>
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Saving…' : 'Save post'}
        </button>
      </div>
    </form>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.4rem' }}>{children}</label>
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
