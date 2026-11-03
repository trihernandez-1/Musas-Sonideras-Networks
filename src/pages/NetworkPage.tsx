import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Collaborator, Connection, Post, Tag } from '../types/models';
import { HERITAGE_DECLARATION_DATE } from '../types/models';
import {
  deleteConnection,
  getAllCollaborators,
  getAllConnections,
  getAllPosts,
  setCollaboratorPosition,
  clearAllCollaboratorPositions,
  upsertManualConnection,
} from '../db/repos';
import { useTags } from '../hooks/useTags';
import { useTheme } from '../hooks/useTheme';
import { hashColor, readCSSVar } from '../utils/colors';
import NetworkGraph from '../components/NetworkGraph';
import type { GraphEdgeInput, GraphNodeInput } from '../components/NetworkGraph';
import DateRangeSlider from '../components/DateRangeSlider';
import ManualConnectionForm from '../components/ManualConnectionForm';
import TagChip from '../components/TagChip';
import StoredImageView from '../components/StoredImageView';

const MIN_RADIUS = 10;
const MAX_RADIUS = 42;
const NEUTRAL_NODE_COLOR = '#9b9490';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function NetworkPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const { tags } = useTags();
  const [theme] = useTheme();

  const [tagFilterIds, setTagFilterIds] = useState<string[]>([]);
  const [colorByTagId, setColorByTagId] = useState<string>('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [draftConnection, setDraftConnection] = useState<{ aId: string; bId: string } | null>(null);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);

  const load = useCallback(async () => {
    const [c, conn, p] = await Promise.all([getAllCollaborators(), getAllConnections(), getAllPosts()]);
    setCollaborators(c);
    setConnections(conn);
    setPosts(p);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Overall date bounds across all posts (used for the slider's min/max and default range).
  const { minDate, maxDate } = useMemo(() => {
    const dates = posts.map((p) => p.postDate).sort();
    if (dates.length === 0) {
      const now = todayISO();
      return { minDate: now, maxDate: now };
    }
    return { minDate: dates[0], maxDate: dates[dates.length - 1] };
  }, [posts]);

  // dateRange stays null (tracking the full, ever-updating post date span) until the
  // researcher actually drags the slider or picks a preset, at which point it's fixed.
  const effectiveRange = dateRange ?? [minDate, maxDate];

  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  // Posts within the active date range, used for both node sizing and co-tagged edge weight.
  const postsInRange = useMemo(
    () => posts.filter((p) => p.postDate >= effectiveRange[0] && p.postDate <= effectiveRange[1]),
    [posts, effectiveRange],
  );
  const postById = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);

  const postCountByCollaborator = useMemo(() => {
    const map = new Map<string, number>();
    for (const post of postsInRange) {
      for (const cid of post.collaboratorIds) {
        map.set(cid, (map.get(cid) ?? 0) + 1);
      }
    }
    return map;
  }, [postsInRange]);

  const visibleCollaborators = useMemo(() => {
    return collaborators.filter((c) => {
      if (c.isCentral) return true;
      if (tagFilterIds.length > 0 && !tagFilterIds.some((tid) => c.tagIds.includes(tid))) return false;
      const hasPostInRange = (postCountByCollaborator.get(c.id) ?? 0) > 0;
      const firstSeenInRange =
        c.firstSeenDate && c.firstSeenDate >= effectiveRange[0] && c.firstSeenDate <= effectiveRange[1];
      return hasPostInRange || firstSeenInRange;
    });
  }, [collaborators, tagFilterIds, postCountByCollaborator, effectiveRange]);

  const visibleIds = useMemo(() => new Set(visibleCollaborators.map((c) => c.id)), [visibleCollaborators]);

  const graphNodes: GraphNodeInput[] = useMemo(() => {
    return visibleCollaborators.map((c) => {
      const postCount = postCountByCollaborator.get(c.id) ?? 0;
      const radius = c.isCentral
        ? Math.max(MIN_RADIUS + 14, MIN_RADIUS + Math.sqrt(postCount) * 9)
        : Math.min(MAX_RADIUS, MIN_RADIUS + Math.sqrt(postCount) * 9);
      let color = NEUTRAL_NODE_COLOR;
      if (colorByTagId) {
        const tag = tagById.get(colorByTagId);
        if (tag && c.tagIds.includes(colorByTagId)) color = tag.color ?? hashColor(tag.id);
      } else if (c.isCentral) {
        color = readCSSVar('--color-primary', '#5e2a52');
      }
      return {
        id: c.id,
        name: c.name,
        radius,
        color,
        isCentral: Boolean(c.isCentral),
        pinnedX: c.pinnedX,
        pinnedY: c.pinnedY,
      };
    });
  }, [visibleCollaborators, postCountByCollaborator, colorByTagId, tagById, theme]);

  const graphEdges: GraphEdgeInput[] = useMemo(() => {
    const result: GraphEdgeInput[] = [];
    for (const conn of connections) {
      if (!visibleIds.has(conn.collaboratorAId) || !visibleIds.has(conn.collaboratorBId)) continue;
      if (conn.type === 'manual') {
        result.push({
          id: conn.id,
          sourceId: conn.collaboratorAId,
          targetId: conn.collaboratorBId,
          type: 'manual',
          weight: 1,
        });
      } else {
        const weight = conn.postIds.filter((pid) => {
          const post = postById.get(pid);
          return post && post.postDate >= effectiveRange[0] && post.postDate <= effectiveRange[1];
        }).length;
        if (weight > 0) {
          result.push({
            id: conn.id,
            sourceId: conn.collaboratorAId,
            targetId: conn.collaboratorBId,
            type: 'co-tagged',
            weight,
          });
        }
      }
    }
    return result;
  }, [connections, visibleIds, postById, effectiveRange]);

  const collaboratorById = useMemo(() => new Map(collaborators.map((c) => [c.id, c])), [collaborators]);

  async function handleNodeDragEnd(id: string, x: number, y: number) {
    await setCollaboratorPosition(id, x, y);
    setCollaborators((prev) => prev.map((c) => (c.id === id ? { ...c, pinnedX: x, pinnedY: y } : c)));
  }

  async function handleResetLayout() {
    if (!confirm('Unpin every node and let the layout settle again? This only affects position, not your data.')) return;
    await clearAllCollaboratorPositions();
    await load();
  }

  function handleConnectionDrawn(aId: string, bId: string) {
    setDraftConnection({ aId, bId });
  }

  async function handleSaveDraftConnection(fields: { label: string; note: string; evidenceText: string }) {
    if (!draftConnection) return;
    await upsertManualConnection({
      collaboratorAId: draftConnection.aId,
      collaboratorBId: draftConnection.bId,
      label: fields.label,
      note: fields.note,
      evidenceText: fields.evidenceText || undefined,
    });
    setDraftConnection(null);
    setConnectMode(false);
    await load();
  }

  async function handleSaveEditingConnection(fields: { label: string; note: string; evidenceText: string }) {
    if (!editingConnection) return;
    await upsertManualConnection({
      id: editingConnection.id,
      collaboratorAId: editingConnection.collaboratorAId,
      collaboratorBId: editingConnection.collaboratorBId,
      label: fields.label,
      note: fields.note,
      evidenceText: fields.evidenceText || undefined,
    });
    setEditingConnection(null);
    await load();
  }

  async function handleDeleteEditingConnection() {
    if (!editingConnection) return;
    await deleteConnection(editingConnection.id);
    setEditingConnection(null);
    setSelectedEdgeId(null);
    await load();
  }

  const selectedNode = selectedNodeId ? collaboratorById.get(selectedNodeId) : null;
  const selectedConnection = selectedEdgeId ? connections.find((c) => c.id === selectedEdgeId) : null;
  const selectedConnectionPosts = selectedConnection
    ? selectedConnection.postIds.map((pid) => postById.get(pid)).filter((p): p is Post => Boolean(p))
    : [];

  function toggleTagFilter(id: string) {
    setTagFilterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h1>Network</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Nodes are collaborators, sized by how many posts they appear in. Solid lines are
          co-tagged in a post; dashed lines are connections you've drawn by hand.
        </p>

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <FieldLabel>Filter by tag</FieldLabel>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', maxWidth: '360px' }}>
              {tags.length === 0 && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No tags yet</span>}
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  onClick={() => toggleTagFilter(tag.id)}
                  style={{ cursor: 'pointer', opacity: tagFilterIds.length === 0 || tagFilterIds.includes(tag.id) ? 1 : 0.4 }}
                >
                  <TagChip tag={tag} size="sm" />
                </span>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Color by tag</FieldLabel>
            <select
              value={colorByTagId}
              onChange={(e) => setColorByTagId(e.target.value)}
              style={selectStyle}
            >
              <option value="">None (neutral)</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '280px' }}>
            <FieldLabel>Date range</FieldLabel>
            <DateRangeSlider
              minDate={minDate}
              maxDate={maxDate}
              value={effectiveRange}
              onChange={setDateRange}
              markDate={HERITAGE_DECLARATION_DATE}
              markLabel="Heritage declaration — Oct 6, 2023"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={connectMode ? 'btn' : 'btn secondary'}
            onClick={() => setConnectMode((v) => !v)}
          >
            {connectMode ? 'Drawing connections — click a node, drag to another' : 'Draw a connection'}
          </button>
          <button type="button" className="btn ghost" onClick={handleResetLayout}>
            Reset layout
          </button>
          <button type="button" className="btn ghost" onClick={() => setDateRange([minDate, maxDate])}>
            Full range
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setDateRange([minDate, HERITAGE_DECLARATION_DATE])}
          >
            Before heritage declaration
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setDateRange([HERITAGE_DECLARATION_DATE, maxDate])}
          >
            Since heritage declaration
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedNode || selectedConnection ? '1fr 340px' : '1fr', gap: '1.25rem' }}>
        <div className="card" style={{ padding: 0, height: '620px', overflow: 'hidden' }} id="network-graph-card">
          {graphNodes.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
              No collaborators match the current filters.
            </div>
          ) : (
            <NetworkGraph
              nodes={graphNodes}
              edges={graphEdges}
              connectMode={connectMode}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              onNodeClick={(id) => {
                setSelectedNodeId(id);
                setSelectedEdgeId(null);
              }}
              onEdgeClick={(id) => {
                setSelectedEdgeId(id);
                setSelectedNodeId(null);
              }}
              onBackgroundClick={() => {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }}
              onNodeDragEnd={handleNodeDragEnd}
              onConnectionDrawn={handleConnectionDrawn}
            />
          )}
        </div>

        {selectedNode && (
          <div className="card">
            <h2>{selectedNode.name}</h2>
            {selectedNode.instagramHandle && (
              <div style={{ color: 'var(--color-accent-2)', marginBottom: '0.5rem' }}>@{selectedNode.instagramHandle}</div>
            )}
            <p>{selectedNode.description || <em style={{ color: 'var(--color-text-muted)' }}>No description yet.</em>}</p>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
              {selectedNode.tagIds.map((tid) => tagById.get(tid)).filter((t): t is Tag => Boolean(t)).map((tag) => (
                <TagChip key={tag.id} tag={tag} size="sm" />
              ))}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              {postCountByCollaborator.get(selectedNode.id) ?? 0} post(s) in the current date range
            </div>
            <Link to={`/collaborators/${selectedNode.id}`} className="btn secondary">
              Open full profile
            </Link>
          </div>
        )}

        {selectedConnection && (
          <div className="card">
            <h2>{selectedConnection.type === 'manual' ? 'Manual connection' : 'Co-tagged'}</h2>
            <p>
              <Link to={`/collaborators/${selectedConnection.collaboratorAId}`}>
                {collaboratorById.get(selectedConnection.collaboratorAId)?.name ?? 'Unknown'}
              </Link>
              {' — '}
              <Link to={`/collaborators/${selectedConnection.collaboratorBId}`}>
                {collaboratorById.get(selectedConnection.collaboratorBId)?.name ?? 'Unknown'}
              </Link>
            </p>
            {selectedConnection.type === 'manual' ? (
              <>
                {selectedConnection.label && <p style={{ fontWeight: 600 }}>{selectedConnection.label}</p>}
                {selectedConnection.note && <p>{selectedConnection.note}</p>}
                {selectedConnection.evidenceText && (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    Evidence: {selectedConnection.evidenceText}
                  </p>
                )}
                <button type="button" className="btn secondary" onClick={() => setEditingConnection(selectedConnection)}>
                  Edit
                </button>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  Co-tagged in {selectedConnectionPosts.length} post(s):
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {selectedConnectionPosts.map((post) => (
                    <div key={post.id} style={{ width: '72px' }}>
                      {post.imageIds[0] && (
                        <StoredImageView
                          imageId={post.imageIds[0]}
                          alt={post.postDate}
                          style={{ width: '72px', height: '90px', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                        />
                      )}
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{post.postDate}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {draftConnection && (
        <ManualConnectionForm
          collaboratorAName={collaboratorById.get(draftConnection.aId)?.name ?? ''}
          collaboratorBName={collaboratorById.get(draftConnection.bId)?.name ?? ''}
          onSave={handleSaveDraftConnection}
          onCancel={() => setDraftConnection(null)}
        />
      )}

      {editingConnection && (
        <ManualConnectionForm
          collaboratorAName={collaboratorById.get(editingConnection.collaboratorAId)?.name ?? ''}
          collaboratorBName={collaboratorById.get(editingConnection.collaboratorBId)?.name ?? ''}
          initialLabel={editingConnection.label ?? ''}
          initialNote={editingConnection.note ?? ''}
          initialEvidence={editingConnection.evidenceText ?? ''}
          onSave={handleSaveEditingConnection}
          onCancel={() => setEditingConnection(null)}
          onDelete={handleDeleteEditingConnection}
        />
      )}
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

const selectStyle: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '0.45rem 0.6rem',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
};
