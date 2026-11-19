// Neon Coast Cover Studio — wires the editor: photos, layout, grade, size,
// caption, per-panel crop and position, and PNG export. A `?shot=` query sets
// up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, SIZES, LAYOUTS, GRADES, panelRects } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const state = {
  layout: 'hero3',
  grade: 'neon',
  size: 'wide',
  photos: [],          // Image objects (samples + uploads)
  photoNames: [],      // display names, same index as photos
  panels: [],          // { photo, zoom, ox, oy } per panel
  title: 'Neon Coast',
  subtitle: 'vice city',
  titleScale: 1,
  selected: 0,         // selected panel index
};

function panelCount() {
  return LAYOUTS[state.layout].panels;
}

function ensurePanels() {
  const n = panelCount();
  while (state.panels.length < n) state.panels.push({ photo: 0, zoom: 1, ox: 0, oy: 0 });
  state.panels.length = n;
  if (state.selected >= n) state.selected = 0;
}

function redraw() {
  ensurePanels();
  drawCover(canvas, state);
  syncPanelControls();
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  return img;
}

function addPhoto(img, name) {
  if (state.photos.length >= 4) {
    $('status').textContent = 'At most 4 photos — remove one first.';
    return false;
  }
  state.photos.push(img);
  state.photoNames.push(name);
  // New photos fill empty panels first, then the selected panel.
  for (const p of state.panels) {
    if (p.photo === 0 && state.photos.length > 1) { /* keep first photo as default */ }
  }
  renderPhotoList();
  return true;
}

function renderPhotoList() {
  const list = $('photos');
  list.innerHTML = '';
  state.photoNames.forEach((name, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb' + (state.panels[state.selected] && state.panels[state.selected].photo === i ? ' active' : '');
    b.textContent = name;
    b.title = `Use "${name}" in the selected panel`;
    b.addEventListener('click', () => {
      state.panels[state.selected].photo = i;
      redraw();
    });
    list.appendChild(b);
  });
  const sel = $('panelPhoto');
  sel.innerHTML = '';
  state.photoNames.forEach((name, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = name;
    sel.appendChild(o);
  });
  if (state.panels[state.selected]) sel.value = String(state.panels[state.selected].photo);
}

function syncPanelControls() {
  const p = state.panels[state.selected];
  if (!p) return;
  $('panelLabel').textContent = `Panel ${state.selected + 1} of ${panelCount()}`;
  $('panelPhoto').value = String(p.photo);
  $('panelZoom').value = String(p.zoom);
  $('zoomVal').textContent = `${Math.round(p.zoom * 100)}%`;
  renderPhotoList();
}

function setLayout(layout) {
  state.layout = layout;
  ensurePanels();
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === layout));
  redraw();
}

function setGrade(grade) {
  state.grade = grade;
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === grade));
  redraw();
}

function setSize(size) {
  state.size = size;
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b.dataset.size === size));
  redraw();
}

function downloadPNG(canvasEl, filename) {
  canvasEl.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

function exportSize(sizeKey) {
  const size = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = size.w; off.height = size.h;
  drawCover(off, { ...state, size: sizeKey });
  downloadPNG(off, `neon-coast-${sizeKey}-${size.w}x${size.h}.png`);
  $('status').textContent = `Exported ${size.label} as PNG.`;
}

async function exportAll() {
  for (const key of Object.keys(SIZES)) {
    exportSize(key);
    await new Promise((r) => setTimeout(r, 350));
  }
}

// ---- controls ----
document.querySelectorAll('[data-layout]').forEach((b) =>
  b.addEventListener('click', () => setLayout(b.dataset.layout)));
document.querySelectorAll('[data-grade]').forEach((b) =>
  b.addEventListener('click', () => setGrade(b.dataset.grade)));
document.querySelectorAll('[data-size]').forEach((b) =>
  b.addEventListener('click', () => setSize(b.dataset.size)));

$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('titleScale').addEventListener('input', (e) => {
  state.titleScale = Number(e.target.value);
  $('scaleVal').textContent = `${Math.round(state.titleScale * 100)}%`;
  redraw();
});
$('panelPhoto').addEventListener('change', (e) => {
  state.panels[state.selected].photo = Number(e.target.value);
  redraw();
});
$('panelZoom').addEventListener('input', (e) => {
  state.panels[state.selected].zoom = Number(e.target.value);
  redraw();
});
$('upload').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const img = await loadImage(URL.createObjectURL(file));
    addPhoto(img, file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Photo');
  }
  redraw();
  e.target.value = '';
});
$('sampleBoulevard').addEventListener('click', async () => {
  const img = await loadSample('boulevard');
  if (addPhoto(img, 'Boulevard')) redraw();
});
$('samplePier').addEventListener('click', async () => {
  const img = await loadSample('pier');
  if (addPhoto(img, 'Pier')) redraw();
});
$('export').addEventListener('click', () => exportSize(state.size));
$('exportAll').addEventListener('click', exportAll);

// ---- canvas: click a panel to select it, drag to move its photo ----
function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const fx = (clientX - rect.left) / rect.width;
  const fy = (clientY - rect.top) / rect.height;
  const frame = state.layout === 'bleed' ? 0 : 0.008;
  const rects = panelRects(state.layout, frame);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (fx >= r.x && fx <= r.x + r.w && fy >= r.y && fy <= r.y + r.h) return i;
  }
  return 0;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  state.selected = i;
  drag = { x: e.clientX, y: e.clientY, ox: state.panels[i].ox, oy: state.panels[i].oy };
  canvas.setPointerCapture(e.pointerId);
  syncPanelControls();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const p = state.panels[state.selected];
  p.ox = drag.ox + (e.clientX - drag.x) / rect.width;
  p.oy = drag.oy + (e.clientY - drag.y) / rect.height;
  p.ox = Math.max(-0.5, Math.min(0.5, p.ox));
  p.oy = Math.max(-0.5, Math.min(0.5, p.oy));
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
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), state, { loadImage, addPhoto, setLayout, setGrade, setSize, redraw });
    return;
  }
  const [bvd, pier] = await Promise.all([loadSample('boulevard'), loadSample('pier')]);
  state.photos = [bvd, pier];
  state.photoNames = ['Boulevard', 'Pier'];
  // Hero gets the boulevard, the small panels share the pier.
  ensurePanels();
  state.panels.forEach((p, i) => { p.photo = state.layout === 'hero3' && i === 0 ? 0 : 1; });
  renderPhotoList();
  redraw();
}

boot();
