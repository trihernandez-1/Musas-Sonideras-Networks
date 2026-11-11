import { useEffect, useRef } from 'react';
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force';
import type { Simulation, SimulationNodeDatum } from 'd3-force';
import { select } from 'd3-selection';
import { drag } from 'd3-drag';
import { zoom, zoomIdentity } from 'd3-zoom';
import { readCSSVar } from '../utils/colors';
import { useTheme } from '../hooks/useTheme';

export interface GraphNodeInput {
  id: string;
  name: string;
  radius: number;
  color: string;
  isCentral: boolean;
  pinnedX?: number;
  pinnedY?: number;
}

export interface GraphEdgeInput {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'co-tagged' | 'manual';
  weight: number;
}

interface SimNode extends SimulationNodeDatum, GraphNodeInput {}
interface SimLink {
  id: string;
  type: 'co-tagged' | 'manual';
  weight: number;
  source: SimNode | string;
  target: SimNode | string;
}

const VIEW_W = 900;
const VIEW_H = 600;

function nodeOpacity(d: SimNode, highlighted?: Set<string> | null): number {
  if (!highlighted || highlighted.size === 0) return 1;
  return highlighted.has(d.id) ? 1 : 0.12;
}

function edgeOpacity(d: SimLink, selectedEdgeId: string | null | undefined, highlighted?: Set<string> | null): number {
  if (highlighted && highlighted.size > 0) {
    const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
    const targetId = typeof d.target === 'string' ? d.target : d.target.id;
    return highlighted.has(sourceId) && highlighted.has(targetId) ? 0.9 : 0.05;
  }
  return d.id === selectedEdgeId ? 1 : 0.55;
}

/** Positions persist across re-filters in this module-level-free, component-scoped cache
 * (one per mounted graph instance, via a ref) so dragging or filtering doesn't rescatter
 * nodes that remain visible. */
export default function NetworkGraph({
  nodes,
  edges,
  connectMode,
  selectedNodeId,
  selectedEdgeId,
  onNodeClick,
  onEdgeClick,
  onBackgroundClick,
  onNodeDragEnd,
  onConnectionDrawn,
  onNodeHover,
  svgRef: externalSvgRef,
  highlightedNodeIds,
}: {
  nodes: GraphNodeInput[];
  edges: GraphEdgeInput[];
  connectMode: boolean;
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
  onNodeClick: (id: string) => void;
  onEdgeClick: (id: string) => void;
  onBackgroundClick: () => void;
  onNodeDragEnd: (id: string, x: number, y: number) => void;
  onConnectionDrawn: (sourceId: string, targetId: string) => void;
  /** Optional: lets the parent show a tooltip at the cursor while hovering a node. Called
   * with null when the pointer leaves it. */
  onNodeHover?: (id: string | null, clientX?: number, clientY?: number) => void;
  /** Optional: lets the parent page read the live SVG element (e.g. for PNG/SVG export). */
  svgRef?: React.RefObject<SVGSVGElement | null>;
  /** When set (non-empty), spotlights these nodes and the edges between them — everything
   * else dims. Used to show who was tagged together in one particular post. */
  highlightedNodeIds?: Set<string> | null;
}) {
  const internalSvgRef = useRef<SVGSVGElement>(null);
  const svgRef = externalSvgRef ?? internalSvgRef;
  const [theme] = useTheme();
  const positionsRef = useRef<Map<string, { x: number; y: number; fx?: number | null; fy?: number | null }>>(
    new Map(),
  );
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const connectModeRef = useRef(connectMode);
  const draftLineRef = useRef<SVGLineElement | null>(null);
  const callbacksRef = useRef({ onNodeClick, onEdgeClick, onBackgroundClick, onNodeDragEnd, onConnectionDrawn, onNodeHover });

  useEffect(() => {
    connectModeRef.current = connectMode;
  }, [connectMode]);

  useEffect(() => {
    callbacksRef.current = { onNodeClick, onEdgeClick, onBackgroundClick, onNodeDragEnd, onConnectionDrawn, onNodeHover };
  });

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    // Resolved to concrete hex once per render, rather than left as var(--x) attribute
    // values: an exported standalone SVG/PNG has no :root to resolve those against.
    const plumColor = readCSSVar('--color-primary', '#5e2a52');
    const mutedColor = readCSSVar('--color-text-muted', '#726d68');
    const surfaceColor = readCSSVar('--color-surface-raised', '#ffffff');
    const textColor = readCSSVar('--color-text', '#1b1a19');

    const zoomLayer = svg.append('g').attr('class', 'zoom-layer');
    const linkLayer = zoomLayer.append('g').attr('class', 'links');
    const nodeLayer = zoomLayer.append('g').attr('class', 'nodes');
    const draftLayer = zoomLayer.append('g').attr('class', 'draft');

    const draftLine = draftLayer
      .append('line')
      .attr('stroke', plumColor)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4 3')
      .attr('opacity', 0)
      .node();
    draftLineRef.current = draftLine;

    const simNodes: SimNode[] = nodes.map((n) => {
      const cached = positionsRef.current.get(n.id);
      const startX = n.pinnedX ?? cached?.x ?? VIEW_W / 2 + (Math.random() - 0.5) * 100;
      const startY = n.pinnedY ?? cached?.y ?? VIEW_H / 2 + (Math.random() - 0.5) * 100;
      return {
        ...n,
        x: startX,
        y: startY,
        fx: n.pinnedX,
        fy: n.pinnedY,
      };
    });
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: SimLink[] = edges
      .filter((e) => nodeById.has(e.sourceId) && nodeById.has(e.targetId))
      .map((e) => ({ id: e.id, type: e.type, weight: e.weight, source: e.sourceId, target: e.targetId }));

    const simulation = forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((l) => (l.type === 'manual' ? 140 : 90 + 20 / Math.sqrt(l.weight)))
          .strength(0.35),
      )
      .force('charge', forceManyBody().strength(-260))
      .force('collide', forceCollide<SimNode>((d) => d.radius + 10))
      .force('center', forceCenter(VIEW_W / 2, VIEW_H / 2).strength(0.03));
    simRef.current = simulation;

    const linkSel = linkLayer
      .selectAll<SVGLineElement, SimLink>('line')
      .data(simLinks, (d) => d.id)
      .join('line')
      .attr('class', 'graph-edge')
      .attr('stroke', (d) => (d.type === 'manual' ? plumColor : mutedColor))
      .attr('stroke-dasharray', (d) => (d.type === 'manual' ? '5 4' : null))
      .attr('stroke-width', (d) => (d.type === 'manual' ? 2 : Math.min(1 + Math.sqrt(d.weight) * 1.4, 9)))
      .attr('stroke-opacity', (d) => edgeOpacity(d, selectedEdgeId, highlightedNodeIds))
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        callbacksRef.current.onEdgeClick(d.id);
      });

    const nodeSel = nodeLayer
      .selectAll<SVGGElement, SimNode>('g')
      .data(simNodes, (d) => d.id)
      .join('g')
      .attr('class', 'graph-node')
      .attr('opacity', (d) => nodeOpacity(d, highlightedNodeIds))
      .style('cursor', connectMode ? 'crosshair' : 'grab');

    nodeSel
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => d.color)
      .attr('stroke', (d) => (d.id === selectedNodeId ? plumColor : surfaceColor))
      .attr('stroke-width', (d) => (d.id === selectedNodeId ? 3 : d.isCentral ? 3 : 1.5));

    nodeSel
      .append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('y', (d) => d.radius + 14)
      .attr('font-size', 11)
      .attr('fill', textColor)
      .style('pointer-events', 'none')
      .style('user-select', 'none');

    nodeSel.on('click', (event, d) => {
      event.stopPropagation();
      if (!connectModeRef.current) callbacksRef.current.onNodeClick(d.id);
    });

    nodeSel
      .on('mouseenter', (event, d) => {
        callbacksRef.current.onNodeHover?.(d.id, event.clientX, event.clientY);
      })
      .on('mousemove', (event, d) => {
        callbacksRef.current.onNodeHover?.(d.id, event.clientX, event.clientY);
      })
      .on('mouseleave', () => {
        callbacksRef.current.onNodeHover?.(null);
      });

    svg.on('click', () => callbacksRef.current.onBackgroundClick());

    // One drag behavior handling both modes — two separate `drag()` instances bound via
    // `.call()` on the same selection silently overwrite each other's listeners, since
    // d3-drag always attaches under the same internal ".drag" event namespace.
    const nodeDrag = drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        event.sourceEvent?.stopPropagation();
        if (connectModeRef.current) {
          if (draftLineRef.current) {
            select(draftLineRef.current)
              .attr('x1', d.x!)
              .attr('y1', d.y!)
              .attr('x2', d.x!)
              .attr('y2', d.y!)
              .attr('opacity', 1);
          }
        } else if (!event.active) {
          simulation.alphaTarget(0.25).restart();
        }
      })
      .on('drag', (event, d) => {
        if (connectModeRef.current) {
          if (draftLineRef.current) {
            select(draftLineRef.current).attr('x2', event.x).attr('y2', event.y);
          }
        } else {
          d.fx = event.x;
          d.fy = event.y;
        }
      })
      .on('end', (event, d) => {
        if (connectModeRef.current) {
          if (draftLineRef.current) select(draftLineRef.current).attr('opacity', 0);
          const [px, py] = [event.x, event.y];
          let nearest: SimNode | null = null;
          let nearestDist = Infinity;
          for (const n of simNodes) {
            if (n.id === d.id) continue;
            const dist = Math.hypot((n.x ?? 0) - px, (n.y ?? 0) - py);
            if (dist < n.radius + 14 && dist < nearestDist) {
              nearest = n;
              nearestDist = dist;
            }
          }
          if (nearest) callbacksRef.current.onConnectionDrawn(d.id, nearest.id);
        } else {
          if (!event.active) simulation.alphaTarget(0);
          positionsRef.current.set(d.id, { x: d.fx ?? d.x!, y: d.fy ?? d.y!, fx: d.fx, fy: d.fy });
          callbacksRef.current.onNodeDragEnd(d.id, d.fx ?? d.x!, d.fy ?? d.y!);
        }
      });

    nodeSel.call(nodeDrag);

    simulation.on('tick', () => {
      linkSel
        .attr('x1', (d) => (d.source as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimNode).y ?? 0);
      nodeSel.attr('transform', (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`);
      for (const n of simNodes) {
        positionsRef.current.set(n.id, { x: n.x ?? 0, y: n.y ?? 0, fx: n.fx, fy: n.fy });
      }
    });

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 3])
      .filter((event) => !(event.target as Element)?.closest?.('.graph-node') && !(event.target as Element)?.closest?.('.graph-edge'))
      .on('zoom', (event) => {
        zoomLayer.attr('transform', event.transform.toString());
      });
    svg.call(zoomBehavior);
    svg.call(zoomBehavior.transform, zoomIdentity);

    return () => {
      simulation.stop();
      callbacksRef.current.onNodeHover?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, connectMode, theme]);

  // Keep selection/highlight state in sync without rebuilding the whole simulation.
  useEffect(() => {
    if (!svgRef.current) return;
    const plumColor = readCSSVar('--color-primary', '#5e2a52');
    const surfaceColor = readCSSVar('--color-surface-raised', '#ffffff');
    const svg = select(svgRef.current);
    svg
      .selectAll<SVGGElement, SimNode>('.graph-node')
      .attr('opacity', (d) => nodeOpacity(d, highlightedNodeIds))
      .select<SVGCircleElement>('circle')
      .attr('stroke', (d) => (d.id === selectedNodeId ? plumColor : surfaceColor))
      .attr('stroke-width', (d) => (d.id === selectedNodeId ? 3 : d.isCentral ? 3 : 1.5));
    svg
      .selectAll<SVGLineElement, SimLink>('.graph-edge')
      .attr('stroke-opacity', (d) => edgeOpacity(d, selectedEdgeId, highlightedNodeIds));
  }, [selectedNodeId, selectedEdgeId, highlightedNodeIds]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
