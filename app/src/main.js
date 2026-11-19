// Neon Coast Cover Studio — the editor. Connects the controls (photos,
// layout, grade, size, caption, per-panel crop) to the poster renderer,
// handles the canvas pointer (click a panel to pick it, drag to move its
// photo) and the PNG export. A `?shot=` query instead sets up a fixed scene
// for a screenshot (see ./shots.js).
import { renderPoster, SIZES, LAYOUTS, GRADES, panelRects } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const poster = $('poster');

const studio = {
  layout: 'hero3',
  grade: 'neon',
  size: 'wide',
  photos: [],       // Image objects (samples + uploads)
  names: [],        // display names, same index as photos
  panels: [],       // { photo, zoom, ox, oy } per panel
  title: 'Neon Coast',
  subtitle: 'vice city',
  titleScale: 1,
  active: 0,        // active panel index
};

const panelCount = () => LAYOUTS[studio.layout].panels;

function syncPanels() {
  const n = panelCount();
  while (studio.panels.length < n) studio.panels.push({ photo: 0, zoom: 1, ox: 0, oy: 0 });
  studio.panels.length = n;
  if (studio.active >= n) studio.active = 0;
}

function repaint() {
  syncPanels();
  renderPoster(poster, studio);
  refreshPanelBox();
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const sampleURL = (name) => `samples/${name}.jpg`;

function addPhoto(img, name) {
  if (studio.photos.length >= 4) {
    $('status').textContent = 'At most 4 photos — remove one first.';
    return false;
  }
  studio.photos.push(img);
  studio.names.push(name);
  renderPhotoChips();
  return true;
}

function renderPhotoChips() {
  const list = $('photos');
  list.innerHTML = '';
  studio.names.forEach((name, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    const used = studio.panels[studio.active] && studio.panels[studio.active].photo === i;
    b.className = 'chip' + (used ? ' on' : '');
    b.textContent = name;
    b.title = `Use "${name}" in the active panel`;
    b.addEventListener('click', () => {
      studio.panels[studio.active].photo = i;
      repaint();
    });
    list.appendChild(b);
  });
  const sel = $('panelPhoto');
  sel.innerHTML = '';
  studio.names.forEach((name, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = name;
    sel.appendChild(o);
  });
  if (studio.panels[studio.active]) sel.value = String(studio.panels[studio.active].photo);
}

function refreshPanelBox() {
  const p = studio.panels[studio.active];
  if (!p) return;
  $('panelLabel').textContent = `Panel ${studio.active + 1} of ${panelCount()}`;
  $('panelPhoto').value = String(p.photo);
  $('panelZoom').value = String(p.zoom);
  $('zoomVal').textContent = `${Math.round(p.zoom * 100)}%`;
  renderPhotoChips();
}

function chooseLayout(layout) {
  studio.layout = layout;
  syncPanels();
  document.querySelectorAll('[data-layout]').forEach((b) =>
    b.classList.toggle('active', b.dataset.layout === layout));
  repaint();
}

function chooseGrade(grade) {
  studio.grade = grade;
  document.querySelectorAll('[data-grade]').forEach((b) =>
    b.classList.toggle('active', b.dataset.grade === grade));
  repaint();
}

function chooseSize(size) {
  studio.size = size;
  document.querySelectorAll('[data-size]').forEach((b) =>
    b.classList.toggle('active', b.dataset.size === size));
  repaint();
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
  off.width = size.width;
  off.height = size.height;
  renderPoster(off, { ...studio, size: sizeKey });
  downloadPNG(off, `neon-coast-${sizeKey}-${size.width}x${size.height}.png`);
  $('status').textContent = `Exported ${size.name} as PNG.`;
}

async function exportAllSizes() {
  for (const key of Object.keys(SIZES)) {
    exportSize(key);
    await new Promise((r) => setTimeout(r, 350));
  }
}

// ---- control wiring ----
document.querySelectorAll('[data-layout]').forEach((b) =>
  b.addEventListener('click', () => chooseLayout(b.dataset.layout)));
document.querySelectorAll('[data-grade]').forEach((b) =>
  b.addEventListener('click', () => chooseGrade(b.dataset.grade)));
document.querySelectorAll('[data-size]').forEach((b) =>
  b.addEventListener('click', () => chooseSize(b.dataset.size)));

$('title').addEventListener('input', (e) => { studio.title = e.target.value; repaint(); });
$('subtitle').addEventListener('input', (e) => { studio.subtitle = e.target.value; repaint(); });
$('titleScale').addEventListener('input', (e) => {
  studio.titleScale = Number(e.target.value);
  $('scaleVal').textContent = `${Math.round(studio.titleScale * 100)}%`;
  repaint();
});
$('panelPhoto').addEventListener('change', (e) => {
  studio.panels[studio.active].photo = Number(e.target.value);
  repaint();
});
$('panelZoom').addEventListener('input', (e) => {
  studio.panels[studio.active].zoom = Number(e.target.value);
  repaint();
});
$('upload').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const img = await loadImage(URL.createObjectURL(file));
    addPhoto(img, file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Photo');
  }
  repaint();
  e.target.value = '';
});
$('sampleBoulevard').addEventListener('click', async () => {
  const img = await loadImage(sampleURL('boulevard'));
  if (addPhoto(img, 'Boulevard')) repaint();
});
$('samplePier').addEventListener('click', async () => {
  const img = await loadImage(sampleURL('pier'));
  if (addPhoto(img, 'Pier')) repaint();
});
$('export').addEventListener('click', () => exportSize(studio.size));
$('exportAll').addEventListener('click', exportAllSizes);

// ---- canvas pointer: click a panel to pick it, drag to move its photo ----
function panelAt(clientX, clientY) {
  const rect = poster.getBoundingClientRect();
  const fx = (clientX - rect.left) / rect.width;
  const fy = (clientY - rect.top) / rect.height;
  const gap = studio.layout === 'bleed' ? 0 : 0.008;
  const rects = panelRects(studio.layout, gap);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (fx >= r.x && fx <= r.x + r.w && fy >= r.y && fy <= r.y + r.h) return i;
  }
  return 0;
}

let drag = null;
poster.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  studio.active = i;
  const p = studio.panels[i];
  drag = { x: e.clientX, y: e.clientY, ox: p.ox, oy: p.oy };
  poster.setPointerCapture(e.pointerId);
  refreshPanelBox();
});
poster.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = poster.getBoundingClientRect();
  const p = studio.panels[studio.active];
  p.ox = Math.max(-0.5, Math.min(0.5, drag.ox + (e.clientX - drag.x) / rect.width));
  p.oy = Math.max(-0.5, Math.min(0.5, drag.oy + (e.clientY - drag.y) / rect.height));
  repaint();
});
poster.addEventListener('pointerup', () => { drag = null; });

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
      loadImage,
      addPhoto,
      setLayout: chooseLayout,
      setGrade: chooseGrade,
      setSize: chooseSize,
      redraw: repaint,
    });
    return;
  }
  const [bvd, pier] = await Promise.all([loadImage(sampleURL('boulevard')), loadImage(sampleURL('pier'))]);
  studio.photos = [bvd, pier];
  studio.names = ['Boulevard', 'Pier'];
  syncPanels();
  // The hero panel gets the boulevard; the small panels share the pier.
  studio.panels.forEach((p, i) => { p.photo = studio.layout === 'hero3' && i === 0 ? 0 : 1; });
  renderPhotoChips();
  repaint();
}

boot();
