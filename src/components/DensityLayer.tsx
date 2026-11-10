import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export interface DensityMarkerDatum {
  id: string;
  lat: number;
  lng: number;
  count: number;
}

const BASE_MIN_RADIUS = 11;
const BASE_MAX_RADIUS = 46;

/** Proportional-symbol markers: one bubble per place, sized by area (not raw radius, so
 * doubling the count doesn't look like 4x the ink) relative to the busiest place currently
 * in view, with the count itself shown inside. Pixel-sized (a div icon, not a geographic
 * Circle) so bubbles stay comparable to each other regardless of zoom level. */
export default function DensityLayer({
  items,
  onItemClick,
  scale = 1,
}: {
  items: DensityMarkerDatum[];
  onItemClick: (id: string) => void;
  /** Multiplies the min/max bubble radius, so the researcher can shrink an overlapping
   * cluster of venues apart or enlarge a sparse map for a clearer print/screenshot. */
  scale?: number;
}) {
  const map = useMap();
  const onItemClickRef = useRef(onItemClick);
  onItemClickRef.current = onItemClick;

  useEffect(() => {
    const layerGroup = L.layerGroup();
    const maxCount = items.reduce((m, i) => Math.max(m, i.count), 1);
    const minRadius = BASE_MIN_RADIUS * scale;
    const maxRadius = BASE_MAX_RADIUS * scale;

    // Largest-first, so a big bubble never visually buries a smaller one that happens to
    // render after it at a nearby point.
    const sorted = [...items].sort((a, b) => b.count - a.count);

    for (const item of sorted) {
      const diameter = Math.round(2 * (minRadius + (maxRadius - minRadius) * Math.sqrt(item.count / maxCount)));
      const opacity = (0.4 + 0.5 * (item.count / maxCount)).toFixed(2);
      const fontSize = Math.round((diameter < 28 ? 11 : diameter < 40 ? 13 : 15) * Math.min(1.25, Math.max(0.75, scale)));
      const icon = L.divIcon({
        className: '',
        html: `<div class="density-marker" style="width:${diameter}px;height:${diameter}px;opacity:${opacity};font-size:${fontSize}px"><span>${item.count}</span></div>`,
        iconSize: [diameter, diameter],
      });
      const marker = L.marker([item.lat, item.lng], { icon, zIndexOffset: Math.round(-item.count) });
      marker.on('click', () => onItemClickRef.current(item.id));
      layerGroup.addLayer(marker);
    }

    map.addLayer(layerGroup);
    return () => {
      map.removeLayer(layerGroup);
    };
  }, [map, items, scale]);

  return null;
}
