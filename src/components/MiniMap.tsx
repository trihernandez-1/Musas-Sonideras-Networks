import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import type { Place } from '../types/models';

/** A small, non-interactive-feeling preview map (used on collaborator/event detail views).
 * The full interactive Map screen with filters and clustering comes in a later stage. */
export default function MiniMap({ places, height = '220px' }: { places: Place[]; height?: string }) {
  if (places.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
        }}
      >
        No places recorded yet
      </div>
    );
  }

  const center: [number, number] =
    places.length === 1
      ? [places[0].lat, places[0].lng]
      : [
          places.reduce((sum, p) => sum + p.lat, 0) / places.length,
          places.reduce((sum, p) => sum + p.lng, 0) / places.length,
        ];

  return (
    <div style={{ height, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={places.length === 1 ? 14 : 11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {places.map((place) => (
          <Marker key={place.id} position={[place.lat, place.lng]}>
            <Popup>{place.name}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
