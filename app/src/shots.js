// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample
// photo loaded; ?shot=cover shows the cover alone, full frame. Query params:
// layout, grade, size, photo, caption, subtitle. window.__shotReady is set
// once the scene is painted.
// Mild framings so panels sharing one photo read as different shots, not
// copies — small zooms and pans only, so faces stay in frame.
const CROPS = [
  { zoom: 1.0, ox: 0, oy: 0 },
  { zoom: 1.2, ox: -0.05, oy: -0.04 },
  { zoom: 1.15, ox: 0.05, oy: 0.03 },
  { zoom: 1.25, ox: 0, oy: -0.05 },
  { zoom: 1.1, ox: -0.06, oy: 0.05 },
  { zoom: 1.3, ox: 0.04, oy: -0.02 },
  { zoom: 1.18, ox: 0.03, oy: 0.06 },
  { zoom: 1.28, ox: -0.03, oy: 0 },
  { zoom: 1.12, ox: 0.06, oy: -0.05 },
];

export async function runShot(shot, query, state, api) {
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
  state.title = caption;
  state.subtitle = subtitle;

  const img = await api.loadImage(`samples/${photo}.jpg`);
  state.photos = [img];
  state.photoNames = [photo[0].toUpperCase() + photo.slice(1)];
  // A second sample fills the small panels of the hero layout.
  try {
    const other = await api.loadImage(`samples/${photo === 'boulevard' ? 'pier' : 'boulevard'}.jpg`);
    state.photos.push(other);
    state.photoNames.push(photo === 'boulevard' ? 'Pier' : 'Boulevard');
  } catch { /* one photo is enough */ }
  // Alternate the photos across panels, so no two neighbours repeat.
  state.panels.forEach((p, i) => { p.photo = i % state.photos.length; });
  // Vary the framing per panel so repeated photos look like distinct shots.
  state.panels.forEach((p, i) => {
    const c = CROPS[i % CROPS.length];
    p.zoom = c.zoom; p.ox = c.ox; p.oy = c.oy;
  });

  if (shot === 'cover') document.body.classList.add('shot-cover');
  api.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
