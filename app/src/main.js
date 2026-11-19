// Neon Coast Cover Studio — the editor. Wires the controls (photos, layout,
// grade, size, caption, per-panel crop) to the cover renderer, handles the
// canvas pointer (click a panel to select it, drag to move its photo) and
// the PNG export. A `?shot=` query instead sets up a fixed scene for a
// screenshot (see ./shots.js).
import { renderCover, POSTER_SIZES, POSTER_LAYOUTS, POSTER_GRADES, computePanels } from './cover.js';
import { runShot } from './shots.js';

const byId = (id) => document.getElementById(id);
const canvas = byId('cover');

const studio = {
  layout: 'hero3',
  grade: 'neon',
  size: 'wide',
  photos: [],       // Image objects (samples + uploads)
  photoNames: [],   // display names, same index as photos
  panels: [],       // { photo, zoom, ox, oy } per panel
  title: 'Neon Coast',
  subtitle: 'vice city',
  titleScale: 1,
  selected: 0,      // selected panel index
};

const panelTotal = () => POSTER_LAYOUTS[studio.layout].panels;

function normalisePanels() {
  const n = panelTotal();
  while (studio.panels.length < n) studio.panels.push({ photo: 0, zoom: 1, ox: 0, oy: 0 });
  studio.panels.length = n;
  if (studio.selected >= n) studio.selected = 0;
}

function redraw() {
  normalisePanels();
  renderCover(canvas, studio);
  refreshPanelControls();
}

function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function loadSample(name) {
  return fetchImage(`samples/${name}.jpg`);
}

function addPhoto(img, name) {
  if (studio.photos.length >= 4) {
    byId('status').textContent = 'At most 4 photos — remove one first.';
    return false;
  }
  studio.photos.push(img);
  studio.photoNames.push(name);
  renderThumbs();
  return true;
}

function renderThumbs() {
  const list = byId('photos');
  list.innerHTML = '';
  studio.photoNames.forEach((name, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    const inSelected = studio.panels[studio.selected] && studio.panels[studio.selected].photo === i;
    b.className = 'thumb' + (inSelected ? ' active' : '');
    b.textContent = name;
    b.title = `Use "${name}" in the selected panel`;
    b.addEventListener('click', () => {
      studio.panels[studio.selected].photo = i;
      redraw();
    });
    list.appendChild(b);
  });
  const sel = byId('panelPhoto');
  sel.innerHTML = '';
  studio.photoNames.forEach((name, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = name;
    sel.appendChild(o);
  });
  if (studio.panels[studio.selected]) sel.value = String(studio.panels[studio.selected].photo);
}

function refreshPanelControls() {
  const p = studio.panels[studio.selected];
  if (!p) return;
  byId('panelLabel').textContent = `Panel ${studio.selected + 1} of ${panelTotal()}`;
  byId('panelPhoto').value = String(p.photo);
  byId('panelZoom').value = String(p.zoom);
  byId('zoomVal').textContent = `${Math.round(p.zoom * 100)}%`;
  renderThumbs();
}

function pickLayout(layout) {
  studio.layout = layout;
  normalisePanels();
  document.querySelectorAll('[data-layout]').forEach((b) =>
    b.classList.toggle('active', b.dataset.layout === layout));
  redraw();
}

function pickGrade(grade) {
  studio.grade = grade;
  document.querySelectorAll('[data-grade]').forEach((b) =>
    b.classList.toggle('active', b.dataset.grade === grade));
  redraw();
}

function pickSize(size) {
  studio.size = size;
  document.querySelectorAll('[data-size]').forEach((b) =>
    b.classList.toggle('active', b.dataset.size === size));
  redraw();
}

function savePNG(canvasEl, filename) {
  canvasEl.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

function exportOne(sizeKey) {
  const size = POSTER_SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  renderCover(off, { ...studio, size: sizeKey });
  savePNG(off, `neon-coast-${sizeKey}-${size.w}x${size.h}.png`);
  byId('status').textContent = `Exported ${size.label} as PNG.`;
}

async function exportEverySize() {
  for (const key of Object.keys(POSTER_SIZES)) {
    exportOne(key);
    await new Promise((r) => setTimeout(r, 350));
  }
}

// ---- control wiring ----
document.querySelectorAll('[data-layout]').forEach((b) =>
  b.addEventListener('click', () => pickLayout(b.dataset.layout)));
document.querySelectorAll('[data-grade]').forEach((b) =>
  b.addEventListener('click', () => pickGrade(b.dataset.grade)));
document.querySelectorAll('[data-size]').forEach((b) =>
  b.addEventListener('click', () => pickSize(b.dataset.size)));

byId('title').addEventListener('input', (e) => { studio.title = e.target.value; redraw(); });
byId('subtitle').addEventListener('input', (e) => { studio.subtitle = e.target.value; redraw(); });
byId('titleScale').addEventListener('input', (e) => {
  studio.titleScale = Number(e.target.value);
  byId('scaleVal').textContent = `${Math.round(studio.titleScale * 100)}%`;
  redraw();
});
byId('panelPhoto').addEventListener('change', (e) => {
  studio.panels[studio.selected].photo = Number(e.target.value);
  redraw();
});
byId('panelZoom').addEventListener('input', (e) => {
  studio.panels[studio.selected].zoom = Number(e.target.value);
  redraw();
});
byId('upload').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const img = await fetchImage(URL.createObjectURL(file));
    addPhoto(img, file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Photo');
  }
  redraw();
  e.target.value = '';
});
byId('sampleBoulevard').addEventListener('click', async () => {
  const img = await loadSample('boulevard');
  if (addPhoto(img, 'Boulevard')) redraw();
});
byId('samplePier').addEventListener('click', async () => {
  const img = await loadSample('pier');
  if (addPhoto(img, 'Pier')) redraw();
});
byId('export').addEventListener('click', () => exportOne(studio.size));
byId('exportAll').addEventListener('click', exportEverySize);

// ---- canvas pointer: click a panel to select it, drag to move its photo ----
function panelAtPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const fx = (clientX - rect.left) / rect.width;
  const fy = (clientY - rect.top) / rect.height;
  const gap = studio.layout === 'bleed' ? 0 : 0.008;
  const rects = computePanels(studio.layout, gap);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (fx >= r.x && fx <= r.x + r.w && fy >= r.y && fy <= r.y + r.h) return i;
  }
  return 0;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAtPoint(e.clientX, e.clientY);
  studio.selected = i;
  const p = studio.panels[i];
  drag = { x: e.clientX, y: e.clientY, ox: p.ox, oy: p.oy };
  canvas.setPointerCapture(e.pointerId);
  refreshPanelControls();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const p = studio.panels[studio.selected];
  p.ox = Math.max(-0.5, Math.min(0.5, drag.ox + (e.clientX - drag.x) / rect.width));
  p.oy = Math.max(-0.5, Math.min(0.5, drag.oy + (e.clientY - drag.y) / rect.height));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

// ---- boot: load the fonts, then the sample photos, then draw ----
async function boot() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('100px Anton'), document.fonts.load('100px Pacifico')]),
      new Promise((r) => setTimeout(r, 4000)),
    ]);
  } catch { /* fall back to system fonts */ }
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot) {
    await runShot(shot, params, studio, {
      loadImage: fetchImage,
      addPhoto,
      setLayout: pickLayout,
      setGrade: pickGrade,
      setSize: pickSize,
      redraw,
    });
    return;
  }
  const [bvd, pier] = await Promise.all([loadSample('boulevard'), loadSample('pier')]);
  studio.photos = [bvd, pier];
  studio.photoNames = ['Boulevard', 'Pier'];
  normalisePanels();
  // The hero panel gets the boulevard; the small panels share the pier.
  studio.panels.forEach((p, i) => { p.photo = studio.layout === 'hero3' && i === 0 ? 0 : 1; });
  renderThumbs();
  redraw();
}

boot();
