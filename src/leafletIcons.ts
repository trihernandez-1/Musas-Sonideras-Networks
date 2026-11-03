import L from 'leaflet';

/** A small plum dot, consistent with the app's event markers on both Network and Map. */
export function eventIcon(): L.DivIcon {
  return L.divIcon({
    className: 'event-marker',
    html: `<span class="event-marker-dot"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/** A hollow ring used while the researcher is placing a new point on the map. */
export function pendingPlaceIcon(): L.DivIcon {
  return L.divIcon({
    className: 'pending-place-marker',
    html: `<span class="pending-place-marker-ring"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}
