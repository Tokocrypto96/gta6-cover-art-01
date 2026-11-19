// Fixed scenes for screenshots: `?shot=editor` shows the editor with a
// sample photo loaded; `?shot=cover` shows the cover alone, full frame.
// Query params: layout, grade, size, photo, caption, subtitle.
// window.__shotReady is set once the scene has been painted.
// Mild framings so panels sharing one photo read as different shots rather
// than copies — small zooms and pans only, so faces stay in frame.
const FRAMINGS = [
  { zoom: 1.0, ox: 0, oy: 0 },
  { zoom: 1.22, ox: -0.05, oy: -0.04 },
  { zoom: 1.16, ox: 0.05, oy: 0.03 },
  { zoom: 1.26, ox: 0, oy: -0.05 },
  { zoom: 1.11, ox: -0.06, oy: 0.05 },
  { zoom: 1.3, ox: 0.04, oy: -0.02 },
  { zoom: 1.19, ox: 0.03, oy: 0.06 },
  { zoom: 1.27, ox: -0.03, oy: 0 },
  { zoom: 1.13, ox: 0.06, oy: -0.05 },
];

export async function runShot(shot, query, studio, api) {
  const layout = query.get('layout') || 'hero3';
  const grade = query.get('grade') || 'neon';
  const size = query.get('size') || 'wide';
  const photo = query.get('photo') || 'boulevard';
  const caption = query.get('caption') || 'Neon Coast';
  const subtitle = query.get('subtitle') || 'vice city';

  api.setLayout(layout);
  api.setGrade(grade);
  api.setSize(size);
  document.getElementById('title').value = caption;
  document.getElementById('subtitle').value = subtitle;
  studio.title = caption;
  studio.subtitle = subtitle;

  const img = await api.loadImage(`samples/${photo}.jpg`);
  studio.photos = [img];
  studio.photoNames = [photo[0].toUpperCase() + photo.slice(1)];
  // A second sample fills the small panels of the hero layout.
  try {
    const other = await api.loadImage(`samples/${photo === 'boulevard' ? 'pier' : 'boulevard'}.jpg`);
    studio.photos.push(other);
    studio.photoNames.push(photo === 'boulevard' ? 'Pier' : 'Boulevard');
  } catch { /* one photo is enough */ }
  // Alternate the photos across panels so no two neighbours repeat.
  studio.panels.forEach((p, i) => { p.photo = i % studio.photos.length; });
  // Vary the framing per panel so repeated photos look like distinct shots.
  studio.panels.forEach((p, i) => {
    const f = FRAMINGS[i % FRAMINGS.length];
    p.zoom = f.zoom;
    p.ox = f.ox;
    p.oy = f.oy;
  });

  if (shot === 'cover') document.body.classList.add('shot-cover');
  api.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
