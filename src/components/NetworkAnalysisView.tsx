import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Collaborator, Post } from '../types/models';
import { getAllCollaborators, getAllPosts } from '../db/repos';
import { analyzeNetwork, buildCollaborationGraph } from '../utils/networkAnalysis';
import type { NodeMetrics } from '../utils/networkAnalysis';
import { downloadText } from '../utils/download';
import EntityMultiSelect from './EntityMultiSelect';

type SortKey = 'degree' | 'clustering' | 'name';

function postLabel(p: Post): string {
  return p.name || p.captionNotes.slice(0, 40) || p.postDate;
}

/**
 * Network-science indicators (Barabási, "Network Science," Ch. 2) computed on the
 * collaborator-collaborator graph projected from shared records: two collaborators are
 * linked if they appear together in at least one record — the same construction as the
 * book's Hollywood actor network (actors linked if they shared a movie).
 */
export default function NetworkAnalysisView() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [scope, setScope] = useState<'all' | 'custom'>('all');
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('degree');

  useEffect(() => {
    Promise.all([getAllPosts(), getAllCollaborators()]).then(([p, c]) => {
      setPosts(p);
      setCollaborators(c);
    });
  }, []);

  const collaboratorNameById = useMemo(() => new Map(collaborators.map((c) => [c.id, c.name])), [collaborators]);

  const postOptions = useMemo(() => posts.map((p) => ({ id: p.id, label: postLabel(p), sublabel: p.postDate })), [posts]);

  const scopedPosts = useMemo(() => {
    if (scope === 'all') return posts;
    return posts.filter((p) => selectedPostIds.includes(p.id));
  }, [scope, posts, selectedPostIds]);

  const graph = useMemo(() => buildCollaborationGraph(scopedPosts, collaboratorNameById), [scopedPosts, collaboratorNameById]);
  const metrics = useMemo(() => analyzeNetwork(graph), [graph]);

  const sortedNodes = useMemo(() => {
    const copy = [...metrics.nodes];
    if (sortKey === 'degree') copy.sort((a, b) => b.degree - a.degree || a.name.localeCompare(b.name, 'es'));
    else if (sortKey === 'clustering') copy.sort((a, b) => b.clusteringCoefficient - a.clusteringCoefficient || a.name.localeCompare(b.name, 'es'));
    else copy.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return copy;
  }, [metrics.nodes, sortKey]);

  function handleExportCsv() {
    const headers = ['Name', 'Degree', 'ClusteringCoefficient', 'ComponentSize', 'InLargestComponent'];
    const rows = sortedNodes.map((n) => [
      n.name,
      String(n.degree),
      n.clusteringCoefficient.toFixed(4),
      String(n.componentSize),
      String(n.inLargestComponent),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(','))
      .join('\r\n');
    const scopeLabel =
      scope === 'all'
        ? 'all-posts'
        : selectedPostIds.length === 1
          ? postLabel(posts.find((p) => p.id === selectedPostIds[0])!).replace(/\s+/g, '-').toLowerCase()
          : `${selectedPostIds.length}-posts`;
    downloadText(csv, `musas-sonideras-analysis-${scopeLabel}.csv`, 'text/csv');
  }

  const noData = scope === 'all' ? posts.length === 0 : selectedPostIds.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Standard network-science measures (after Barabási's <em>Network Science</em>, Ch. 2),
          computed on a graph where two collaborators are linked if they appear together in at
          least one record — the same construction as a co-starring actor network, just for
          records instead of movies. This is the same underlying co-appearance graph as the
          Aggregate Network view, with graph-theoretic measures added.
        </p>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <FieldLabel>Scope</FieldLabel>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className={scope === 'all' ? 'btn' : 'btn ghost'} onClick={() => setScope('all')}>
                All posts
              </button>
              <button type="button" className={scope === 'custom' ? 'btn' : 'btn ghost'} onClick={() => setScope('custom')}>
                Select posts
              </button>
            </div>
          </div>
          {scope === 'custom' && (
            <div style={{ minWidth: '260px' }}>
              <FieldLabel>Posts</FieldLabel>
              <EntityMultiSelect options={postOptions} selectedIds={selectedPostIds} onChange={setSelectedPostIds} placeholder="Search posts…" />
            </div>
          )}
          {!noData && (
            <button type="button" className="btn ghost" onClick={handleExportCsv}>
              Export node stats (CSV)
            </button>
          )}
        </div>
      </div>

      {noData ? (
        <div className="card" style={{ color: 'var(--color-text-muted)' }}>
          {scope === 'all' ? 'No posts yet.' : 'Select one or more posts above to analyze them.'}
        </div>
      ) : (
        <>
          <div className="card">
            <h2>Network overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
              <StatTile label="Collaborators (N)" value={String(metrics.nodeCount)} detail="nodes in this graph" />
              <StatTile label="Connections (L)" value={String(metrics.edgeCount)} detail="pairs who share a post" />
              <StatTile label="Average degree" value={metrics.averageDegree.toFixed(2)} detail="connections per person, on average" />
              <StatTile label="Density" value={`${(metrics.density * 100).toFixed(1)}%`} detail="of all possible connections exist" />
              <StatTile
                label="Components"
                value={String(metrics.componentCount)}
                detail={metrics.componentCount > 1 ? `largest has ${metrics.largestComponentSize} of ${metrics.nodeCount}` : 'fully connected'}
              />
              <StatTile
                label="Diameter"
                value={metrics.diameter === null ? '—' : String(metrics.diameter)}
                detail="longest shortest path, main cluster"
              />
              <StatTile
                label="Avg. path length"
                value={metrics.averagePathLength === null ? '—' : metrics.averagePathLength.toFixed(2)}
                detail="typical distance, main cluster"
              />
              <StatTile
                label="Avg. clustering"
                value={metrics.averageClusteringCoefficient.toFixed(2)}
                detail="how tight-knit people's circles are"
              />
            </div>
            <details style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>What do these mean?</summary>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li><strong>Density</strong> — real-world networks are almost always sparse (a low percentage); that's normal, not a problem with your data.</li>
                <li><strong>Components</strong> — separate, unconnected clusters. More than one usually means some records or people haven't yet been linked to the rest through shared participation.</li>
                <li><strong>Diameter / average path length</strong> — computed only within the largest connected cluster (isolated people and small separate clusters have no defined distance to the rest).</li>
                <li><strong>Clustering coefficient</strong> — for one person, the share of their collaborators who also collaborate with each other; 0 means none do, 1 means they're all mutually connected. The network average is the overall tendency toward tight-knit sub-groups rather than loose chains.</li>
              </ul>
            </details>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2 style={{ marginBottom: 0 }}>Collaborators ({sortedNodes.length})</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FieldLabel>Sort by</FieldLabel>
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} style={selectStyle}>
                  <option value="degree">Degree (most connected first)</option>
                  <option value="clustering">Clustering coefficient</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Degree</th>
                    <th style={thStyle}>Clustering</th>
                    <th style={thStyle}>Cluster</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedNodes.map((n: NodeMetrics) => (
                    <tr key={n.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={tdStyle}>
                        <Link to={`/collaborators/${n.id}`}>{n.name}</Link>
                      </td>
                      <td style={tdStyle}>{n.degree}</td>
                      <td style={tdStyle}>{n.clusteringCoefficient.toFixed(2)}</td>
                      <td style={{ ...tdStyle, color: 'var(--color-text-muted)' }}>
                        {n.inLargestComponent ? 'Main' : n.componentSize === 1 ? 'Isolated' : `Separate (${n.componentSize})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>{value}</div>
      <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{detail}</div>
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

const thStyle: React.CSSProperties = { padding: '0.5rem', fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' };
const tdStyle: React.CSSProperties = { padding: '0.5rem' };
const selectStyle: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '0.35rem 0.5rem',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: '0.85rem',
};
