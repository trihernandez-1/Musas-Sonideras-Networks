import { useCallback, useEffect, useState } from 'react';
import type { Collaborator, Place } from '../types/models';
import { getAllCollaborators, getAllKnownRoles, getAllPlaces, quickCreateCollaborator, saveImage, upsertPost } from '../db/repos';
import { useTags } from '../hooks/useTags';
import { usePostThemes } from '../hooks/usePostThemes';
import PostForm from '../components/PostForm';
import type { PostFormValue } from '../components/PostForm';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): PostFormValue {
  return {
    files: [],
    name: undefined,
    postDate: todayISO(),
    endDate: undefined,
    postUrl: '',
    captionNotes: '',
    interpretation: '',
    collaboratorIds: [],
    collaboratorRoles: {},
    placeId: undefined,
    tagIds: [],
    themeIds: [],
  };
}

export default function InboxPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [knownRoles, setKnownRoles] = useState<string[]>([]);
  const { tags, createTag } = useTags();
  const { themes, createTheme } = usePostThemes();
  const [form, setForm] = useState<PostFormValue>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshCollaborators = useCallback(async () => {
    const all = await getAllCollaborators();
    all.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    setCollaborators(all);
  }, []);

  const refreshPlaces = useCallback(async () => {
    const all = await getAllPlaces();
    all.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    setPlaces(all);
  }, []);

  const refreshKnownRoles = useCallback(async () => {
    setKnownRoles(await getAllKnownRoles());
  }, []);

  useEffect(() => {
    refreshCollaborators();
    refreshPlaces();
    refreshKnownRoles();
  }, [refreshCollaborators, refreshPlaces, refreshKnownRoles]);

  async function handleCreateCollaborator(handle: string) {
    const c = await quickCreateCollaborator(handle);
    await refreshCollaborators();
    return c;
  }

  async function handleSubmit() {
    if (form.files.length === 0 && !form.name?.trim()) {
      setMessage('Add a screenshot or give it a name before saving — an empty record isn’t useful on its own.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const images = await Promise.all(form.files.map((file) => saveImage(file, file.name)));
      await upsertPost({
        name: form.name?.trim() || undefined,
        imageIds: images.map((img) => img.id),
        postDate: form.postDate,
        endDate: form.endDate,
        postUrl: form.postUrl?.trim() || undefined,
        captionNotes: form.captionNotes,
        interpretation: form.interpretation,
        collaboratorIds: form.collaboratorIds,
        collaboratorRoles: form.collaboratorRoles,
        placeId: form.placeId,
        tagIds: form.tagIds,
        themeIds: form.themeIds,
      });
      setMessage('Saved. Add another?');
      setForm({ ...emptyForm(), postDate: form.postDate });
      await refreshKnownRoles();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h1>Add a post</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          A screenshot, a gathering, or both at once — fill in whatever applies. Nothing is
          required except a date, though a screenshot or a name makes it worth saving.
        </p>
      </div>

      {message && (
        <div className="card" style={{ borderColor: 'var(--color-accent)' }}>
          {message}
        </div>
      )}

      <PostForm
        value={form}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        collaborators={collaborators}
        onCreateCollaborator={handleCreateCollaborator}
        places={places}
        onPlaceCreated={(place) => setPlaces((prev) => [...prev, place].sort((a, b) => a.name.localeCompare(b.name, 'es')))}
        tags={tags}
        onCreateTag={createTag}
        themes={themes}
        onCreateTheme={createTheme}
        knownRoles={knownRoles}
      />

      <div>
        <button type="button" className="btn" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
