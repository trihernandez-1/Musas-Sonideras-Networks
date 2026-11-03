import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import { eventIcon } from '../leafletIcons';

export interface ClusterMarkerDatum {
  id: string;
  lat: number;
  lng: number;
}

/** Clusters markers when zoomed out, spiderfying them apart at max zoom — built directly on
 * leaflet.markercluster rather than a React wrapper, since react-leaflet has no first-party
 * clustering support. */
export default function ClusterLayer<T extends ClusterMarkerDatum>({
  items,
  onItemClick,
}: {
  items: T[];
  onItemClick: (id: string) => void;
}) {
  const map = useMap();
  const onItemClickRef = useRef(onItemClick);
  onItemClickRef.current = onItemClick;

  useEffect(() => {
    const group = L.markerClusterGroup({
      maxClusterRadius: 50,
      iconCreateFunction: (cluster) =>
        L.divIcon({
          html: `<div class="marker-cluster-custom">${cluster.getChildCount()}</div>`,
          className: '',
          iconSize: [36, 36],
        }),
    });

    for (const item of items) {
      const marker = L.marker([item.lat, item.lng], { icon: eventIcon() });
      marker.on('click', () => onItemClickRef.current(item.id));
      group.addLayer(marker);
    }

    map.addLayer(group);
    return () => {
      map.removeLayer(group);
    };
  }, [map, items]);

  return null;
}
