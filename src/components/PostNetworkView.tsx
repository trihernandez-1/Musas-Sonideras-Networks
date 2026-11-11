import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Collaborator, Post } from '../types/models';
import { getAllCollaborators, getAllPosts } from '../db/repos';
import NetworkGraph from './NetworkGraph';
import type { GraphEdgeInput, GraphNodeInput } from './NetworkGraph';
import PostNetworkPicker from './PostNetworkPicker';
import { hashColor, readCSSVar } from '../utils/colors';
import { exportSvgAsPngFile, exportSvgAsSvgFile } from '../utils/exportSvg';
import { formatRoles, primaryRole } from '../utils/roles';

const POST_NODE_ID = '__post__';
const NEUTRAL_COLOR = '#9b9490';

function postLabel(p: Post): string {
  return p.name || p.captionNotes.slice(0, 40) || p.postDate;
}

/** A single record's participants as a simple hub-and-spoke graph, colored by the role each
 * person played — a focused counterpart to the aggregate Network view across everything. */
export default function PostNetworkView() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    Promise.all([getAllPosts(), getAllCollaborators()]).then(([p, c]) => {
      setPosts(p);
      setCollaborators(c);
    });
  }, []);

  const collaboratorById = useMemo(() => new Map(collaborators.map((c) => [c.id, c])), [collaborators]);
  const post = selectedPostId ? posts.find((p) => p.id === selectedPostId) ?? null : null;

  const roleColor = useCallback((role: string | undefined): string => {
    if (!role || !role.trim()) return NEUTRAL_COLOR;
    return hashColor(role.trim().toLowerCase());
  }, []);

  const graphNodes: GraphNodeInput[] = useMemo(() => {
    if (!post) return [];
    const postNode: GraphNodeInput = {
      id: POST_NODE_ID,
      name: postLabel(post),
      radius: 32,
      color: readCSSVar('--color-primary', '#5e2a52'),
      isCentral: true,
    };
    const participantNodes: GraphNodeInput[] = post.collaboratorIds.map((cid) => ({
      id: cid,
      name: collaboratorById.get(cid)?.name ?? 'Unknown',
      radius: 18,
      color: roleColor(primaryRole(post, cid)),
      isCentral: false,
    }));
    return [postNode, ...participantNodes];
  }, [post, collaboratorById, roleColor]);

  const graphEdges: GraphEdgeInput[] = useMemo(() => {
    if (!post) return [];
    return post.collaboratorIds.map((cid) => ({
      id: `${POST_NODE_ID}-${cid}`,
      sourceId: POST_NODE_ID,
      targetId: cid,
      type: 'manual' as const,
      weight: 1,
    }));
  }, [post]);

  const roleLegend = useMemo(() => {
    if (!post) return [];
    const seen = new Map<string, string>();
    post.collaboratorIds.forEach((cid) => {
      const role = primaryRole(post, cid);
      if (role && !seen.has(role)) seen.set(role, roleColor(role));
    });
    return Array.from(seen.entries());
  }, [post, roleColor]);

  const selectedParticipant = selectedNodeId && selectedNodeId !== POST_NODE_ID ? collaboratorById.get(selectedNodeId) : null;
  const selectedRoles = selectedParticipant && post ? formatRoles(post, selectedParticipant.id) : '';
  const postNodeSelected = selectedNodeId === POST_NODE_ID;

  function handleExportSvg() {
    if (svgRef.current && post) exportSvgAsSvgFile(svgRef.current, `musas-sonideras-${fileSlug(postLabel(post))}.svg`);
  }
  async function handleExportPng() {
    if (svgRef.current && post) await exportSvgAsPngFile(svgRef.current, `musas-sonideras-${fileSlug(postLabel(post))}.png`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Pick one record to see just its participants, colored by each person's main role (a
          person can have more than one role; this shows the first one). Set roles from the
          record's own page, under "Who did what."
        </p>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <FieldLabel>Record</FieldLabel>
            <PostNetworkPicker
              posts={posts}
              selectedId={selectedPostId}
              onChange={(id) => {
                setSelectedPostId(id);
                setSelectedNodeId(null);
              }}
            />
          </div>
          {post && (
            <span style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn ghost" onClick={handleExportSvg}>
                Export SVG
              </button>
              <button type="button" className="btn ghost" onClick={handleExportPng}>
                Export PNG
              </button>
            </span>
          )}
        </div>
        {roleLegend.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            {roleLegend.map(([role, color]) => (
              <span key={role} className="chip" style={{ fontSize: '0.78rem' }}>
                <span
                  aria-hidden
                  style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', marginRight: '0.4em' }}
                />
                {role}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedParticipant || postNodeSelected ? '1fr 340px' : '1fr', gap: '1.25rem' }}>
        <div className="card" style={{ padding: 0, height: '560px', overflow: 'hidden' }}>
          {!post ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
              {posts.length === 0 ? 'No posts yet.' : 'Pick a record above to see its network.'}
            </div>
          ) : (
            <NetworkGraph
              svgRef={svgRef}
              nodes={graphNodes}
              edges={graphEdges}
              connectMode={false}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={null}
              onNodeClick={setSelectedNodeId}
              onEdgeClick={() => {}}
              onBackgroundClick={() => setSelectedNodeId(null)}
              onNodeDragEnd={() => {}}
              onConnectionDrawn={() => {}}
            />
          )}
        </div>

        {postNodeSelected && post && (
          <div className="card">
            <h2>{postLabel(post)}</h2>
            <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>{post.postDate}</div>
            <Link to={`/posts/${post.id}`} className="btn secondary">
              Open full record
            </Link>
          </div>
        )}

        {selectedParticipant && (
          <div className="card">
            <h2>{selectedParticipant.name}</h2>
            <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              {selectedRoles ? `Role${selectedRoles.includes(',') ? 's' : ''}: ${selectedRoles}` : 'No role noted for this record.'}
            </div>
            <Link to={`/collaborators/${selectedParticipant.id}`} className="btn secondary">
              Open full profile
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function fileSlug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'post';
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
      {children}
    </div>
  );
}
