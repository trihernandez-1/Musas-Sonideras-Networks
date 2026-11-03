// Loads a small set of clearly-fake demo records so the researcher can test the
// views before entering real data. Every ID created here is tracked in
// localStorage so `deleteDemoData` can remove exactly those records, nothing else.

import {
  deleteCollaborator,
  deleteConnection,
  deleteEvent,
  deletePlace,
  deletePost,
  deleteTag,
  deleteTheme,
  findOrCreateTag,
  findOrCreateTheme,
  saveImage,
  upsertCollaborator,
  upsertManualConnection,
  upsertEvent,
  upsertPlace,
  upsertPost,
} from './db/repos';

const DEMO_IDS_KEY = 'musas-sonideras:demo-ids';

interface DemoIds {
  collaboratorIds: string[];
  postIds: string[];
  placeIds: string[];
  eventIds: string[];
  connectionIds: string[];
  tagIds: string[];
  themeIds: string[];
}

function loadTrackedIds(): DemoIds {
  const raw = localStorage.getItem(DEMO_IDS_KEY);
  if (!raw) {
    return { collaboratorIds: [], postIds: [], placeIds: [], eventIds: [], connectionIds: [], tagIds: [], themeIds: [] };
  }
  const parsed = JSON.parse(raw);
  return { themeIds: [], ...parsed };
}

function saveTrackedIds(ids: DemoIds): void {
  localStorage.setItem(DEMO_IDS_KEY, JSON.stringify(ids));
}

export function hasDemoData(): boolean {
  const ids = loadTrackedIds();
  return ids.collaboratorIds.length > 0;
}

async function placeholderImage(label: string, bg: string, fg = '#fff8ec'): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 600;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  ctx.fillStyle = fg;
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  const lines = label.split('\n');
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, canvas.height / 2 + i * 36 - ((lines.length - 1) * 18));
  });
  ctx.font = '16px sans-serif';
  ctx.fillText('DEMO — not a real post', canvas.width / 2, canvas.height - 30);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

export async function loadDemoData(): Promise<void> {
  if (hasDemoData()) return;

  const ids: DemoIds = {
    collaboratorIds: [],
    postIds: [],
    placeIds: [],
    eventIds: [],
    connectionIds: [],
    tagIds: [],
    themeIds: [],
  };

  const sonideroTag = await findOrCreateTag('Sonidero');
  const venueTag = await findOrCreateTag('Venue');
  const governmentTag = await findOrCreateTag('Gobierno');
  const designTag = await findOrCreateTag('Diseño gráfico');
  ids.tagIds.push(sonideroTag.id, venueTag.id, governmentTag.id, designTag.id);

  const heritageTheme = await findOrCreateTheme('Patrimonio y reconocimiento (demo)');
  const genderTheme = await findOrCreateTheme('Redes de género (demo)');
  ids.themeIds.push(heritageTheme.id, genderTheme.id);

  const musas = await upsertCollaborator({
    name: 'Musas Sonideras',
    instagramHandle: 'musassonideras',
    description: 'Colectivo central del estudio (cuenta de ejemplo — DEMO).',
    tagIds: [sonideroTag.id],
    firstSeenDate: '2022-01-15',
    notes: 'Nodo central de la red. [DEMO]',
    isCentral: true,
  });
  const djAna = await upsertCollaborator({
    name: 'DJ Ana Reyes (demo)',
    instagramHandle: 'djanareyes_demo',
    description: 'Sonidera invitada, especializada en cumbia sonidera. [DEMO]',
    tagIds: [sonideroTag.id],
    firstSeenDate: '2022-03-01',
    notes: '',
  });
  const salonCorona = await upsertCollaborator({
    name: 'Salón Corona (demo)',
    instagramHandle: 'saloncorona_demo',
    description: 'Salón de baile en la colonia Doctores. [DEMO]',
    tagIds: [venueTag.id],
    firstSeenDate: '2022-03-01',
    notes: '',
  });
  const culturaCDMX = await upsertCollaborator({
    name: 'Secretaría de Cultura CDMX (demo)',
    instagramHandle: 'cultura_cdmx_demo',
    description: 'Dependencia de gobierno que otorgó la declaratoria de patrimonio. [DEMO]',
    tagIds: [governmentTag.id],
    firstSeenDate: '2023-10-06',
    notes: 'Relacionada con la declaratoria del 6 de octubre de 2023. [DEMO]',
  });
  const disenadora = await upsertCollaborator({
    name: 'Fernanda López — Diseño (demo)',
    instagramHandle: 'fernandalopez_dg_demo',
    description: 'Diseñadora gráfica que hace los carteles de los eventos. [DEMO]',
    tagIds: [designTag.id],
    firstSeenDate: '2022-06-10',
    notes: '',
  });
  ids.collaboratorIds.push(musas.id, djAna.id, salonCorona.id, culturaCDMX.id, disenadora.id);

  const place = await upsertPlace({
    name: 'Salón Corona (demo)',
    address: 'Av. Doctor Río de la Loza, Doctores, CDMX',
    lat: 19.4164,
    lng: -99.1447,
    placeTypeTagIds: [venueTag.id],
    notes: '[DEMO]',
  });
  ids.placeIds.push(place.id);

  const img1 = await saveImage(
    await placeholderImage('Baile Sonidero\nMarzo 2022', '#c1272d'),
    'demo-post-1.png',
  );
  const img2 = await saveImage(
    await placeholderImage('Declaratoria\nPatrimonio Cultural\n6 oct 2023', '#1b5e20'),
    'demo-post-2.png',
  );
  const img3 = await saveImage(
    await placeholderImage('Cartel del evento\n(diseño)', '#004e89'),
    'demo-post-3.png',
  );

  const event = await upsertEvent({
    name: 'Baile Sonidero de Primavera (demo)',
    startDate: '2022-03-12',
    placeId: place.id,
    description: 'Evento de ejemplo en el Salón Corona. [DEMO]',
    interpretation:
      'Este evento de ejemplo ilustra cómo se conectan sonideras, el salón y la diseñadora gráfica a través de una sola publicación. [DEMO]',
    postIds: [],
    collaboratorIds: [musas.id, djAna.id, salonCorona.id, disenadora.id],
    tagIds: [sonideroTag.id],
  });
  ids.eventIds.push(event.id);

  const post1 = await upsertPost({
    imageIds: [img1.id, img3.id],
    postDate: '2022-03-10',
    postUrl: '',
    captionNotes: 'Invitación al baile de primavera con DJ Ana Reyes. [DEMO]',
    interpretation:
      'La publicación anuncia una colaboración entre Musas Sonideras y una sonidera invitada, en un salón de baile histórico. [DEMO]',
    collaboratorIds: [musas.id, djAna.id, salonCorona.id, disenadora.id],
    eventId: event.id,
    tagIds: [sonideroTag.id],
    themeIds: [genderTheme.id],
  });
  const post2 = await upsertPost({
    imageIds: [img2.id],
    postDate: '2023-10-06',
    postUrl: '',
    captionNotes: 'Anuncio de la declaratoria de patrimonio cultural inmaterial. [DEMO]',
    interpretation:
      'Momento clave: la cultura sonidera es declarada patrimonio cultural inmaterial de la Ciudad de México. Este post sirve como punto de comparación antes/después en la red. [DEMO]',
    collaboratorIds: [musas.id, culturaCDMX.id],
    tagIds: [governmentTag.id],
    themeIds: [heritageTheme.id],
  });
  ids.postIds.push(post1.id, post2.id);
  // event.postIds is derived data — upsertPost already recomputed it from post1's eventId.

  const manualConn = await upsertManualConnection({
    collaboratorAId: djAna.id,
    collaboratorBId: salonCorona.id,
    label: 'Residente mensual (demo)',
    note: 'DJ Ana Reyes toca una vez al mes en este salón desde 2022, según entrevista informal. [DEMO]',
    evidenceText: 'Comunicación personal, marzo 2022 (dato de ejemplo).',
  });
  ids.connectionIds.push(manualConn.id);

  saveTrackedIds(ids);
}

export async function deleteDemoData(): Promise<void> {
  const ids = loadTrackedIds();

  await Promise.all(ids.postIds.map((id) => deletePost(id)));
  await Promise.all(ids.eventIds.map((id) => deleteEvent(id)));
  await Promise.all(ids.placeIds.map((id) => deletePlace(id)));
  for (const id of ids.connectionIds) {
    try {
      await deleteConnection(id);
    } catch {
      // co-tagged connections tied to demo posts are already gone via deletePost
    }
  }
  await Promise.all(ids.collaboratorIds.map((id) => deleteCollaborator(id)));
  await Promise.all(ids.tagIds.map((id) => deleteTag(id)));
  await Promise.all(ids.themeIds.map((id) => deleteTheme(id)));

  localStorage.removeItem(DEMO_IDS_KEY);
}
