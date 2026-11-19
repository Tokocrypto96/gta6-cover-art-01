// Poster engine — draws a GTA-style multi-panel cover onto a 2D canvas.
// Photos are cover-fitted into panels, a Vice City colour grade is washed
// over the whole poster, and a big gradient title with a neon script
// subtitle is lettered at the foot. Pure canvas, no libraries, no network.

export const SIZES = {
  square: { width: 1080, height: 1080, name: 'Square 1080×1080' },
  portrait: { width: 1080, height: 1350, name: 'Portrait 1080×1350' },
  wide: { width: 1920, height: 1080, name: 'Wide 1920×1080' },
};

export const LAYOUTS = {
  grid4: { name: '2×2 grid', panels: 4 },
  hero3: { name: 'Hero + 3', panels: 4 },
  bleed: { name: 'Full bleed', panels: 1 },
  grid9: { name: '3×3 grid', panels: 9 },
};

// A grade is a top-to-bottom colour wash (gradient stops) plus a flat veil
// laid over the poster. Each one is its own take on a Vice City sunset.
export const GRADES = {
  sunset: {
    name: 'Sunset',
    wash: [[0, 'rgba(255,196,110,0.00)'], [0.5, 'rgba(255,110,70,0.28)'], [1, 'rgba(190,20,110,0.55)']],
    veil: 'rgba(255,150,70,0.09)',
  },
  neon: {
    name: 'Neon night',
    wash: [[0, 'rgba(0,225,255,0.10)'], [0.5, 'rgba(170,45,255,0.30)'], [1, 'rgba(255,0,150,0.55)']],
    veil: 'rgba(0,200,255,0.07)',
  },
  vice: {
    name: 'Vice City',
    wash: [[0, 'rgba(140,0,255,0.13)'], [0.5, 'rgba(235,35,215,0.30)'], [1, 'rgba(255,0,170,0.54)']],
    veil: 'rgba(160,45,255,0.09)',
  },
  gold: {
    name: 'Golden hour',
    wash: [[0, 'rgba(255,225,135,0.06)'], [0.5, 'rgba(255,175,55,0.29)'], [1, 'rgba(255,115,5,0.50)']],
    veil: 'rgba(255,195,75,0.11)',
  },
  noir: {
    name: 'Noir',
    wash: [[0, 'rgba(215,215,235,0.05)'], [0.5, 'rgba(95,95,125,0.24)'], [1, 'rgba(20,12,40,0.55)']],
    veil: 'rgba(255,185,105,0.05)',
  },
};

// Panel rects as fractions of the canvas. `inset` is the white frame gap,
// also as a fraction. Every layout is a table of [x, y, w, h] cells.
const CELLS = {
  hero3: [[0, 0, 0.62, 1], [0.62, 0, 0.38, 1 / 3], [0.62, 1 / 3, 0.38, 1 / 3], [0.62, 2 / 3, 0.38, 1 / 3]],
  grid4: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
  grid9: [[0, 0, 1 / 3, 1 / 3], [1 / 3, 0, 1 / 3, 1 / 3], [2 / 3, 0, 1 / 3, 1 / 3],
          [0, 1 / 3, 1 / 3, 1 / 3], [1 / 3, 1 / 3, 1 / 3, 1 / 3], [2 / 3, 1 / 3, 1 / 3, 1 / 3],
          [0, 2 / 3, 1 / 3, 1 / 3], [1 / 3, 2 / 3, 1 / 3, 1 / 3], [2 / 3, 2 / 3, 1 / 3, 1 / 3]],
  bleed: [[0, 0, 1, 1]],
};

export function panelRects(layout, inset) {
  const cells = CELLS[layout] || CELLS.grid4;
  const g = inset;
  return cells.map(([x, y, w, h]) => ({ x: x + g, y: y + g, w: w - 2 * g, h: h - 2 * g }));
}

// A reusable noise tile for the film grain, built once per page.
let grainTile = null;
function grainPattern(ctx) {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 128;
  tile.height = 128;
  const tc = tile.getContext('2d');
  const img = tc.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 90);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tc.putImageData(img, 0, 0);
  grainTile = ctx.createPattern(tile, 'repeat');
  return grainTile;
}

// Draws one photo cover-fitted into a rectangle, with zoom and pan offsets.
function drawPhoto(ctx, img, rx, ry, rw, rh, zoom, ox, oy) {
  const scale = Math.max(rw / img.naturalWidth, rh / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rx + (rw - dw) / 2 + ox * rw;
  const dy = ry + (rh - dh) / 2 + oy * rh;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// Empty panel: deep violet with a pink sun, so an unfinished poster still
// reads as a poster.
function drawEmpty(ctx, rx, ry, rw, rh) {
  ctx.fillStyle = '#2b1250';
  ctx.fillRect(rx, ry, rw, rh);
  ctx.fillStyle = '#ff5e8a';
  ctx.beginPath();
  ctx.arc(rx + rw / 2, ry + rh * 0.4, Math.min(rw, rh) * 0.15, 0, Math.PI * 2);
  ctx.fill();
}

// The colour grade: a gradient wash in soft-light and overlay, then a veil.
function drawGrade(ctx, w, h, key) {
  const grade = GRADES[key] || GRADES.sunset;
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, colour] of grade.wash) wash.addColorStop(at, colour);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = grade.veil;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  const r = Math.hypot(w, h) / 2;
  const v = ctx.createRadialGradient(w / 2, h / 2, r * 0.4, w / 2, h / 2, r);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(10,2,20,0.32)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

function drawGrain(ctx, w, h) {
  const pattern = grainPattern(ctx);
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Shrink the title until it fits the width; returns the fitted size.
function fitTitle(ctx, text, maxWidth, start) {
  let size = start;
  ctx.font = `${size}px Anton, sans-serif`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  return size;
}

// The caption at the foot: neon script subtitle above a big gradient title
// with a neon underline.
function drawCaption(ctx, w, h, title, subtitle, scale) {
  const pad = w * 0.045;
  const base = h - h * 0.05;
  const name = (title || '').trim().toUpperCase();
  const sub = (subtitle || '').trim();
  const start = h * 0.11 * (scale || 1);
  let titleSize = 0;
  if (name) titleSize = fitTitle(ctx, name, w - pad * 2, start);

  if (sub) {
    const subSize = Math.max(18, Math.round(h * 0.04));
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = '#ff2fb3';
    ctx.shadowBlur = subSize * 0.5;
    ctx.fillStyle = '#ff7ae0';
    ctx.fillText(sub, w / 2, base - titleSize - h * 0.014);
    ctx.shadowBlur = 0;
  }
  if (name) {
    ctx.font = `${titleSize}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const tg = ctx.createLinearGradient(0, base - titleSize, 0, base);
    tg.addColorStop(0, '#ffe27a');
    tg.addColorStop(0.45, '#ff9e57');
    tg.addColorStop(0.75, '#ff5e8a');
    tg.addColorStop(1, '#c65df0');
    ctx.lineWidth = Math.max(2, titleSize * 0.04);
    ctx.strokeStyle = 'rgba(18,4,32,0.9)';
    ctx.lineJoin = 'round';
    ctx.strokeText(name, w / 2, base);
    ctx.fillStyle = tg;
    ctx.shadowColor = 'rgba(255,60,160,0.5)';
    ctx.shadowBlur = titleSize * 0.16;
    ctx.fillText(name, w / 2, base);
    ctx.shadowBlur = 0;
    const tw = ctx.measureText(name).width;
    const uy = base + h * 0.016;
    ctx.fillStyle = '#ff2fb3';
    ctx.shadowColor = '#ff2fb3';
    ctx.shadowBlur = h * 0.011;
    ctx.fillRect(w / 2 - tw / 2, uy, tw, Math.max(3, h * 0.005));
    ctx.shadowBlur = 0;
  }
}

/**
 * Renders the whole poster onto `canvas`.
 * opts: { layout, grade, size, photos: Image[], panels: [{ photo, zoom, ox, oy }],
 *         title, subtitle, titleScale }
 */
export function renderPoster(canvas, opts) {
  const ctx = canvas.getContext('2d');
  const size = SIZES[opts.size] || SIZES.square;
  if (canvas.width !== size.width || canvas.height !== size.height) {
    canvas.width = size.width;
    canvas.height = size.height;
  }
  const W = canvas.width;
  const H = canvas.height;
  const short = Math.min(W, H);
  const inset = opts.layout === 'bleed' ? 0 : Math.max(4, Math.round(short * 0.008)) / short;

  // White poster paper, then the photo panels.
  ctx.fillStyle = '#fdfbf7';
  ctx.fillRect(0, 0, W, H);
  const rects = panelRects(opts.layout, inset);
  const panels = opts.panels || [];
  rects.forEach((r, i) => {
    const rx = r.x * W;
    const ry = r.y * H;
    const rw = r.w * W;
    const rh = r.h * H;
    const p = panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const img = opts.photos && opts.photos[p.photo];
    if (img) drawPhoto(ctx, img, rx, ry, rw, rh, p.zoom || 1, p.ox || 0, p.oy || 0);
    else drawEmpty(ctx, rx, ry, rw, rh);
  });

  drawGrade(ctx, W, H, opts.grade);

  // Dark band at the foot so the caption reads over any photo.
  const band = H * 0.3;
  const scrim = ctx.createLinearGradient(0, H - band, 0, H);
  scrim.addColorStop(0, 'rgba(10,4,24,0)');
  scrim.addColorStop(1, 'rgba(10,4,24,0.75)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H - band, W, band);

  drawCaption(ctx, W, H, opts.title, opts.subtitle, opts.titleScale);
  drawVignette(ctx, W, H);
  drawGrain(ctx, W, H);
  return canvas;
}
