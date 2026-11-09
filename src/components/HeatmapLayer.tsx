import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { HeatLayer } from 'leaflet.heat';

export interface HeatPoint {
  lat: number;
  lng: number;
  /** How many records at this point — passed straight through as the point's weight. */
  intensity: number;
}

/** A density "glow" overlay — weighted by record count per place, so a venue used many
 * times reads as a hotter spot rather than just another same-size dot. */
export default function HeatmapLayer({ points }: { points: HeatPoint[] }) {
  const map = useMap();

  useEffect(() => {
    const maxIntensity = points.reduce((m, p) => Math.max(m, p.intensity), 1);
    const heat = new HeatLayer(
      points.map((p): [number, number, number] => [p.lat, p.lng, p.intensity]),
      {
        radius: 32,
        blur: 24,
        maxZoom: 16,
        minOpacity: 0.25,
        max: maxIntensity,
        gradient: {
          0.2: '#f1e6ee',
          0.4: '#d8a9d0',
          0.65: '#a9578f',
          0.85: '#5e2a52',
          1.0: '#2c1227',
        },
      },
    );
    // leaflet.heat's shipped types are written against Leaflet v2's generic Layer class;
    // this project is on Leaflet v1.9 with the community (non-generic) @types/leaflet, so
    // the two don't line up structurally even though HeatLayer is a perfectly ordinary
    // Leaflet layer at runtime — cast through the real Layer type to bridge that gap.
    const layer = heat as unknown as L.Layer;
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);

  return null;
}
