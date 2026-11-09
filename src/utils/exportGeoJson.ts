import type { Post } from '../types/models';
import { getAllCollaborators, getAllPlaces, getAllPosts, getAllTags } from '../db/repos';
import { downloadText } from './download';

function postLabel(p: Post): string {
  return p.name || p.postDate;
}

export async function exportGeoJson(): Promise<void> {
  const [places, posts, collaborators, tags] = await Promise.all([
    getAllPlaces(),
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
            name: postLabel(post),
            postDate: post.postDate,
            endDate: post.endDate ?? '',
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
    `musas-sonideras-places-posts-${new Date().toISOString().slice(0, 10)}.geojson`,
    'application/geo+json',
  );
}
