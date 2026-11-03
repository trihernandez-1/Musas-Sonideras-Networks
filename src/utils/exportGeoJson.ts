import { getAllCollaborators, getAllEvents, getAllPlaces, getAllPosts, getAllTags } from '../db/repos';
import { downloadText } from './download';

export async function exportGeoJson(): Promise<void> {
  const [places, events, posts, collaborators, tags] = await Promise.all([
    getAllPlaces(),
    getAllEvents(),
    getAllPosts(),
    getAllCollaborators(),
    getAllTags(),
  ]);

  const tagById = new Map(tags.map((t) => [t.id, t]));
  const collaboratorById = new Map(collaborators.map((c) => [c.id, c]));
  const placeById = new Map(places.map((p) => [p.id, p]));
  const tagLabels = (ids: string[]) => ids.map((id) => tagById.get(id)?.label).filter(Boolean).join('; ');

  const features = [
    ...places.map((place) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [place.lng, place.lat] },
      properties: {
        kind: 'place',
        id: place.id,
        name: place.name,
        address: place.address ?? '',
        types: tagLabels(place.placeTypeTagIds),
        notes: place.notes,
      },
    })),
    ...events
      .filter((e) => e.placeId && placeById.has(e.placeId))
      .map((event) => {
        const place = placeById.get(event.placeId!)!;
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [place.lng, place.lat] },
          properties: {
            kind: 'event',
            id: event.id,
            name: event.name,
            startDate: event.startDate,
            endDate: event.endDate ?? '',
            placeName: place.name,
            collaborators: event.collaboratorIds.map((cid) => collaboratorById.get(cid)?.name).filter(Boolean).join('; '),
            tags: tagLabels(event.tagIds),
          },
        };
      }),
    ...posts
      .filter((p) => p.placeId && placeById.has(p.placeId))
      .map((post) => {
        const place = placeById.get(post.placeId!)!;
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [place.lng, place.lat] },
          properties: {
            kind: 'post',
            id: post.id,
            postDate: post.postDate,
            placeName: place.name,
            collaborators: post.collaboratorIds.map((cid) => collaboratorById.get(cid)?.name).filter(Boolean).join('; '),
            tags: tagLabels(post.tagIds),
          },
        };
      }),
  ];

  const geojson = {
    type: 'FeatureCollection' as const,
    features,
  };

  downloadText(
    JSON.stringify(geojson, null, 2),
    `musas-sonideras-places-events-${new Date().toISOString().slice(0, 10)}.geojson`,
    'application/geo+json',
  );
}
