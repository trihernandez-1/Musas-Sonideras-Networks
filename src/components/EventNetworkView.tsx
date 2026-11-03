import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Collaborator, EventRecord } from '../types/models';
import { getAllCollaborators, getAllEvents } from '../db/repos';
import NetworkGraph from './NetworkGraph';
import type { GraphEdgeInput, GraphNodeInput } from './NetworkGraph';
import EventNetworkPicker from './EventNetworkPicker';
import { hashColor, readCSSVar } from '../utils/colors';
import { exportSvgAsPngFile, exportSvgAsSvgFile } from '../utils/exportSvg';

const EVENT_NODE_ID = '__event__';
const NEUTRAL_COLOR = '#9b9490';

/** A single event's participants as a simple hub-and-spoke graph, colored by the role each
 * person played — a focused counterpart to the aggregate Network view across everything. */
export default function EventNetworkView() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    Promise.all([getAllEvents(), getAllCollaborators()]).then(([e, c]) => {
      setEvents(e);
      setCollaborators(c);
    });
  }, []);

  const collaboratorById = useMemo(() => new Map(collaborators.map((c) => [c.id, c])), [collaborators]);
  const event = selectedEventId ? events.find((e) => e.id === selectedEventId) ?? null : null;

  const roleColor = useCallback((role: string | undefined): string => {
    if (!role || !role.trim()) return NEUTRAL_COLOR;
    return hashColor(role.trim().toLowerCase());
  }, []);

  const graphNodes: GraphNodeInput[] = useMemo(() => {
    if (!event) return [];
    const eventNode: GraphNodeInput = {
      id: EVENT_NODE_ID,
      name: event.name,
      radius: 32,
      color: readCSSVar('--color-primary', '#5e2a52'),
      isCentral: true,
    };
    const participantNodes: GraphNodeInput[] = event.collaboratorIds.map((cid) => ({
      id: cid,
      name: collaboratorById.get(cid)?.name ?? 'Unknown',
      radius: 18,
      color: roleColor(event.collaboratorRoles?.[cid]),
      isCentral: false,
    }));
    return [eventNode, ...participantNodes];
  }, [event, collaboratorById, roleColor]);

  const graphEdges: GraphEdgeInput[] = useMemo(() => {
    if (!event) return [];
    return event.collaboratorIds.map((cid) => ({
      id: `${EVENT_NODE_ID}-${cid}`,
      sourceId: EVENT_NODE_ID,
      targetId: cid,
      type: 'manual' as const,
      weight: 1,
    }));
  }, [event]);

  const roleLegend = useMemo(() => {
    if (!event) return [];
    const seen = new Map<string, string>();
    event.collaboratorIds.forEach((cid) => {
      const role = event.collaboratorRoles?.[cid];
      if (role && role.trim() && !seen.has(role)) seen.set(role, roleColor(role));
    });
    return Array.from(seen.entries());
  }, [event, roleColor]);

  const selectedParticipant = selectedNodeId && selectedNodeId !== EVENT_NODE_ID ? collaboratorById.get(selectedNodeId) : null;
  const selectedRole = selectedParticipant && event ? event.collaboratorRoles?.[selectedParticipant.id] : undefined;
  const eventNodeSelected = selectedNodeId === EVENT_NODE_ID;

  function handleExportSvg() {
    if (svgRef.current && event) exportSvgAsSvgFile(svgRef.current, `musas-sonideras-${fileSlug(event.name)}.svg`);
  }
  async function handleExportPng() {
    if (svgRef.current && event) await exportSvgAsPngFile(svgRef.current, `musas-sonideras-${fileSlug(event.name)}.png`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Pick one event to see just its participants, colored by the role you gave each
          person. Set roles from the event's own page, under "Who did what."
        </p>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <FieldLabel>Event</FieldLabel>
            <EventNetworkPicker
              events={events}
              selectedId={selectedEventId}
              onChange={(id) => {
                setSelectedEventId(id);
                setSelectedNodeId(null);
              }}
            />
          </div>
          {event && (
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

      <div style={{ display: 'grid', gridTemplateColumns: selectedParticipant || eventNodeSelected ? '1fr 340px' : '1fr', gap: '1.25rem' }}>
        <div className="card" style={{ padding: 0, height: '560px', overflow: 'hidden' }}>
          {!event ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
              {events.length === 0 ? 'No events yet.' : 'Pick an event above to see its network.'}
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

        {eventNodeSelected && event && (
          <div className="card">
            <h2>{event.name}</h2>
            <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>{event.startDate}</div>
            <Link to={`/events/${event.id}`} className="btn secondary">
              Open full event
            </Link>
          </div>
        )}

        {selectedParticipant && (
          <div className="card">
            <h2>{selectedParticipant.name}</h2>
            <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              {selectedRole ? `Role: ${selectedRole}` : 'No role noted for this event.'}
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
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'event';
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
      {children}
    </div>
  );
}
