// Graph-theoretic metrics, following Barabási's "Network Science" (Ch. 2) definitions:
// degree & average degree (2.2), density (via 2.12's Lmax), connected components (2.9),
// diameter & average path length (2.14, via breadth-first search, Box 2.5), and local/average
// clustering coefficient (2.15)/(2.16). Deliberately limited to what that chapter covers —
// no weighted-network or centrality measures beyond degree, which it treats as advanced topics.

export interface AnalysisNode {
  id: string;
  name: string;
}

export interface AnalysisEdge {
  a: string;
  b: string;
  /** How many records this pair shares — not used in the core metrics (which treat the
   * graph as simple/unweighted, per the chapter's own convention), shown only as extra detail. */
  weight: number;
}

export interface GraphInput {
  nodes: AnalysisNode[];
  edges: AnalysisEdge[];
}

export interface NodeMetrics {
  id: string;
  name: string;
  degree: number;
  clusteringCoefficient: number;
  componentSize: number;
  inLargestComponent: boolean;
}

export interface NetworkMetrics {
  nodeCount: number;
  edgeCount: number;
  averageDegree: number;
  /** Fraction of all possible links that exist, 0..1 (Lmax per Eq. 2.12). */
  density: number;
  componentCount: number;
  largestComponentSize: number;
  /** Longest shortest path, computed within the largest component only (Eq. 2.14 is only
   * defined for node pairs that share a component). Null if that component has <2 nodes. */
  diameter: number | null;
  averagePathLength: number | null;
  averageClusteringCoefficient: number;
  nodes: NodeMetrics[];
}

export function analyzeNetwork(graph: GraphInput): NetworkMetrics {
  const ids = graph.nodes.map((n) => n.id);
  const nameById = new Map(graph.nodes.map((n) => [n.id, n.name]));

  const adjacency = new Map<string, Set<string>>();
  ids.forEach((id) => adjacency.set(id, new Set()));
  const seen = new Set<string>();
  let edgeCount = 0;
  for (const e of graph.edges) {
    if (e.a === e.b) continue;
    if (!adjacency.has(e.a) || !adjacency.has(e.b)) continue;
    const key = [e.a, e.b].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    adjacency.get(e.a)!.add(e.b);
    adjacency.get(e.b)!.add(e.a);
    edgeCount++;
  }

  const n = ids.length;
  const averageDegree = n > 0 ? (2 * edgeCount) / n : 0;
  const maxEdges = n > 1 ? (n * (n - 1)) / 2 : 0;
  const density = maxEdges > 0 ? edgeCount / maxEdges : 0;

  // Connected components, via breadth-first search from each unvisited node (Box 2.6).
  const componentOf = new Map<string, number>();
  const componentSizes: number[] = [];
  let compIndex = 0;
  for (const start of ids) {
    if (componentOf.has(start)) continue;
    const queue = [start];
    componentOf.set(start, compIndex);
    let size = 0;
    while (queue.length > 0) {
      const cur = queue.shift()!;
      size++;
      for (const neighbor of adjacency.get(cur) ?? []) {
        if (!componentOf.has(neighbor)) {
          componentOf.set(neighbor, compIndex);
          queue.push(neighbor);
        }
      }
    }
    componentSizes.push(size);
    compIndex++;
  }
  const componentCount = compIndex;
  const largestComponentSize = componentSizes.length > 0 ? Math.max(...componentSizes) : 0;
  const largestComponentIndex = componentSizes.indexOf(largestComponentSize);
  const largestNodes = ids.filter((id) => componentOf.get(id) === largestComponentIndex);

  // Diameter and average path length within the largest component (Box 2.5's BFS,
  // repeated from every node in that component).
  let diameter: number | null = null;
  let averagePathLength: number | null = null;
  if (largestNodes.length > 1) {
    let maxDist = 0;
    let totalDist = 0;
    let pairCount = 0;
    for (const start of largestNodes) {
      const dist = new Map<string, number>([[start, 0]]);
      const queue = [start];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        const d = dist.get(cur)!;
        for (const neighbor of adjacency.get(cur) ?? []) {
          if (!dist.has(neighbor)) {
            dist.set(neighbor, d + 1);
            queue.push(neighbor);
          }
        }
      }
      for (const other of largestNodes) {
        if (other === start) continue;
        const d = dist.get(other);
        if (d !== undefined) {
          maxDist = Math.max(maxDist, d);
          totalDist += d;
          pairCount++;
        }
      }
    }
    diameter = maxDist;
    averagePathLength = pairCount > 0 ? totalDist / pairCount : null;
  }

  // Local clustering coefficient per node (Eq. 2.15): the fraction of a node's neighbor
  // pairs that are themselves connected.
  const nodes: NodeMetrics[] = ids.map((id) => {
    const neighbors = Array.from(adjacency.get(id) ?? []);
    const k = neighbors.length;
    let linksAmongNeighbors = 0;
    if (k >= 2) {
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          if (adjacency.get(neighbors[i])?.has(neighbors[j])) linksAmongNeighbors++;
        }
      }
    }
    const clusteringCoefficient = k >= 2 ? (2 * linksAmongNeighbors) / (k * (k - 1)) : 0;
    const ci = componentOf.get(id) ?? -1;
    return {
      id,
      name: nameById.get(id) ?? 'Unknown',
      degree: k,
      clusteringCoefficient,
      componentSize: componentSizes[ci] ?? 1,
      inLargestComponent: ci === largestComponentIndex,
    };
  });

  const averageClusteringCoefficient =
    nodes.length > 0 ? nodes.reduce((sum, m) => sum + m.clusteringCoefficient, 0) / nodes.length : 0;

  return {
    nodeCount: n,
    edgeCount,
    averageDegree,
    density,
    componentCount,
    largestComponentSize,
    diameter,
    averagePathLength,
    averageClusteringCoefficient,
    nodes,
  };
}

/**
 * Projects records onto a collaborator-collaborator graph: two collaborators are linked if
 * they shared at least one record, weighted by how many. This is the same kind of one-mode
 * projection as Barabási's Hollywood actor network (actors linked if they shared a movie) —
 * here collaborators linked if they shared a record. Pass one post or every post.
 */
export function buildCollaborationGraph(
  records: Array<{ collaboratorIds: string[] }>,
  collaboratorNameById: Map<string, string>,
): GraphInput {
  const nodeIds = new Set<string>();
  const edgeByKey = new Map<string, AnalysisEdge>();
  for (const record of records) {
    const ids = Array.from(new Set(record.collaboratorIds));
    ids.forEach((id) => nodeIds.add(id));
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const [a, b] = [ids[i], ids[j]].sort();
        const key = `${a}|${b}`;
        const existing = edgeByKey.get(key);
        if (existing) existing.weight++;
        else edgeByKey.set(key, { a, b, weight: 1 });
      }
    }
  }
  const nodes: AnalysisNode[] = Array.from(nodeIds).map((id) => ({
    id,
    name: collaboratorNameById.get(id) ?? 'Unknown',
  }));
  return { nodes, edges: Array.from(edgeByKey.values()) };
}
