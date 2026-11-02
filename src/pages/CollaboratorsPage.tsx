import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Collaborator, Tag } from '../types/models';
import { getAllCollaborators, normalizeForSearch, quickCreateCollaborator } from '../db/repos';
import { useTags } from '../hooks/useTags';
import TagChip from '../components/TagChip';

export default function CollaboratorsPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [quickHandle, setQuickHandle] = useState('');
  const { tags } = useTags();

  async function refresh() {
    const all = await getAllCollaborators();
    all.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    setCollaborators(all);
  }

  useEffect(() => {
    refresh();
  }, []);

  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    return collaborators.filter((c) => {
      if (tagFilter && !c.tagIds.includes(tagFilter)) return false;
      if (!q) return true;
      return (
        normalizeForSearch(c.name).includes(q) ||
        normalizeForSearch(c.instagramHandle ?? '').includes(q) ||
        normalizeForSearch(c.description).includes(q)
      );
    });
  }, [collaborators, query, tagFilter]);

  async function handleQuickAdd() {
    const handle = quickHandle.trim();
    if (!handle) return;
    await quickCreateCollaborator(handle);
    setQuickHandle('');
    await refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h1>Collaborators</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Every account or actor tagged across your posts: sonideras, collectives, venues,
          cultural institutions, government agencies, designers, and more.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, handle, or description…"
            style={{
              flex: 1,
              minWidth: '220px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.5rem 0.75rem',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
            }}
          />
          <input
            value={quickHandle}
            onChange={(e) => setQuickHandle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
            placeholder="@new_handle"
            style={{
              width: '200px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.5rem 0.75rem',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
            }}
          />
          <button type="button" className="btn secondary" onClick={handleQuickAdd}>
            + Quick add
          </button>
        </div>
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            <TagFilterChip label="All" active={tagFilter === null} onClick={() => setTagFilter(null)} />
            {tags.map((tag) => (
              <span key={tag.id} onClick={() => setTagFilter(tag.id === tagFilter ? null : tag.id)}>
                <TagChipClickable tag={tag} active={tagFilter === tag.id} />
              </span>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        {filtered.map((c) => (
          <Link key={c.id} to={`/collaborators/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{c.name}</div>
              {c.instagramHandle && (
                <div style={{ color: 'var(--color-accent-2)' }}>@{c.instagramHandle}</div>
              )}
              {c.description && (
                <div
                  style={{
                    color: 'var(--color-text-muted)',
                    fontSize: '0.9rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {c.description}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                {c.tagIds.map((id) => tagById.get(id)).filter((t): t is Tag => Boolean(t)).map((tag) => (
                  <TagChip key={tag.id} tag={tag} size="sm" />
                ))}
              </div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)' }}>No collaborators match yet.</p>
        )}
      </div>
    </div>
  );
}

function TagFilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="chip"
      style={{
        cursor: 'pointer',
        border: '1px solid var(--color-border)',
        background: active ? 'var(--color-primary)' : 'var(--color-surface)',
        color: active ? 'var(--color-primary-contrast)' : 'var(--color-text)',
      }}
    >
      {label}
    </button>
  );
}

function TagChipClickable({ tag, active }: { tag: Tag; active: boolean }) {
  return (
    <span style={{ cursor: 'pointer', opacity: active ? 1 : 0.6 }}>
      <TagChip tag={tag} size="sm" />
    </span>
  );
}
