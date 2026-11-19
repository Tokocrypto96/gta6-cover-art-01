// Neon Coast — cover renderer. Paints a GTA-style multi-panel poster onto a
// 2D canvas: photos fitted into panels, a Vice City colour grade, a white
// poster frame, a big gradient title and a neon script subtitle, plus grain
// and a vignette. Pure canvas, no libraries, no network.

export const POSTER_SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  wide: { w: 1920, h: 1080, label: 'Wide 1920 x 1080' },
};

export const POSTER_LAYOUTS = {
  grid4: { label: 'Grid 2 x 2', panels: 4 },
  hero3: { label: 'Hero + 3', panels: 4 },
  bleed: { label: 'Full bleed', panels: 1 },
  grid9: { label: 'Grid 3 x 3', panels: 9 },
};

// Each grade is a vertical wash: colour stops for the gradient plus a flat
// tint laid over the whole poster.
export const POSTER_GRADES = {
  sunset: {
    label: 'Sunset',
    stops: [[0, 'rgba(255,190,120,0.00)'], [0.55, 'rgba(255,120,80,0.30)'], [1, 'rgba(200,30,120,0.60)']],
    tint: 'rgba(255,140,60,0.10)',
  },
  neon: {
    label: 'Neon night',
    stops: [[0, 'rgba(0,220,255,0.12)'], [0.55, 'rgba(180,50,255,0.32)'], [1, 'rgba(255,0,140,0.58)']],
    tint: 'rgba(0,210,255,0.08)',
  },
  vice: {
    label: 'Vice City',
    stops: [[0, 'rgba(150,0,255,0.15)'], [0.55, 'rgba(230,40,220,0.33)'], [1, 'rgba(255,0,160,0.57)']],
    tint: 'rgba(170,50,255,0.10)',
  },
  gold: {
    label: 'Golden hour',
    stops: [[0, 'rgba(255,220,130,0.07)'], [0.55, 'rgba(255,170,50,0.31)'], [1, 'rgba(255,120,10,0.54)']],
    tint: 'rgba(255,190,70,0.12)',
  },
  noir: {
    label: 'Noir',
    stops: [[0, 'rgba(210,210,230,0.06)'], [0.55, 'rgba(100,100,130,0.26)'], [1, 'rgba(25,15,45,0.58)']],
    tint: 'rgba(255,180,100,0.06)',
  },
};

/**
 * Panel rectangles for a layout, as fractions of the canvas (0..1).
 * `gap` is the white frame gap, also as a fraction of the canvas.
 * Returns an array of { x, y, w, h }.
 */
export function computePanels(layout, gap) {
  const g = gap;
  const box = (x, y, w, h) => ({ x: x + g, y: y + g, w: w - 2 * g, h: h - 2 * g });
  if (layout === 'hero3') {
    return [
      box(0, 0, 0.62, 1),
      box(0.62, 0, 0.38, 1 / 3),
      box(0.62, 1 / 3, 0.38, 1 / 3),
      box(0.62, 2 / 3, 0.38, 1 / 3),
    ];
  }
  if (layout === 'bleed') return [{ x: 0, y: 0, w: 1, h: 1 }];
  if (layout === 'grid9') {
    const cells = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) cells.push(box(col / 3, row / 3, 1 / 3, 1 / 3));
    }
    return cells;
  }
  // grid4 (default)
  return [
    box(0, 0, 0.5, 0.5), box(0.5, 0, 0.5, 0.5),
    box(0, 0.5, 0.5, 0.5), box(0.5, 0.5, 0.5, 0.5),
  ];
}

// A small noise tile, reused as a repeating pattern for the grain.
let noiseTile = null;
function noisePattern(ctx) {
  if (noiseTile) return noiseTile;
  const tile = document.createElement('canvas');
  tile.width = 160;
  tile.height = 160;
  const tc = tile.getContext('2d');
  const data = tc.createImageData(160, 160);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 96 + Math.floor(Math.random() * 96);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tc.putImageData(data, 0, 0);
  noiseTile = ctx.createPattern(tile, 'repeat');
  return noiseTile;
}

/** Draws one image cover-fitted into a rectangle, with zoom and pan. */
function paintPhoto(ctx, img, rx, ry, rw, rh, zoom, ox, oy) {
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

/** Draws the empty-panel placeholder: deep purple with a pink sun. */
function paintPlaceholder(ctx, rx, ry, rw, rh) {
  ctx.fillStyle = '#2a1245';
  ctx.fillRect(rx, ry, rw, rh);
  ctx.fillStyle = '#ff5e8a';
  ctx.beginPath();
  ctx.arc(rx + rw / 2, ry + rh * 0.42, Math.min(rw, rh) * 0.16, 0, Math.PI * 2);
  ctx.fill();
}

/** Lays the grade over the whole poster: gradient wash + flat tint. */
function paintGrade(ctx, w, h, gradeKey) {
  const g = POSTER_GRADES[gradeKey] || POSTER_GRADES.sunset;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  for (const [stop, colour] of g.stops) grad.addColorStop(stop, colour);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = g.tint;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function paintVignette(ctx, w, h) {
  const r = Math.hypot(w, h) / 2;
  const v = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(8,2,18,0.34)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

function paintGrain(ctx, w, h) {
  const pattern = noisePattern(ctx);
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Shrinks the title font until it fits the width; returns the size. */
function fitFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, sans-serif`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  return size;
}

/** Paints the subtitle (neon script) and title (gradient block) at the foot. */
function paintCaption(ctx, w, h, title, subtitle, titleScale) {
  const pad = w * 0.045;
  const baseline = h - h * 0.055;
  const cleanTitle = (title || '').trim().toUpperCase();
  const cleanSub = (subtitle || '').trim();
  const startSize = h * 0.115 * (titleScale || 1);
  let titleSize = 0;
  if (cleanTitle) titleSize = fitFont(ctx, cleanTitle, w - pad * 2, startSize);

  if (cleanSub) {
    const subSize = Math.max(18, Math.round(h * 0.042));
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = '#ff2fb3';
    ctx.shadowBlur = subSize * 0.55;
    ctx.fillStyle = '#ff7ae0';
    ctx.fillText(cleanSub, w / 2, baseline - titleSize - h * 0.012);
    ctx.shadowBlur = 0;
  }
  if (cleanTitle) {
    ctx.font = `${titleSize}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const tg = ctx.createLinearGradient(0, baseline - titleSize, 0, baseline);
    tg.addColorStop(0, '#ffe27a');
    tg.addColorStop(0.45, '#ff9e57');
    tg.addColorStop(0.75, '#ff5e8a');
    tg.addColorStop(1, '#c65df0');
    ctx.lineWidth = Math.max(2, titleSize * 0.045);
    ctx.strokeStyle = 'rgba(18,4,32,0.9)';
    ctx.lineJoin = 'round';
    ctx.strokeText(cleanTitle, w / 2, baseline);
    ctx.fillStyle = tg;
    ctx.shadowColor = 'rgba(255,60,160,0.55)';
    ctx.shadowBlur = titleSize * 0.18;
    ctx.fillText(cleanTitle, w / 2, baseline);
    ctx.shadowBlur = 0;
    // Neon underline under the title.
    const tw = ctx.measureText(cleanTitle).width;
    const uy = baseline + h * 0.018;
    ctx.fillStyle = '#ff2fb3';
    ctx.shadowColor = '#ff2fb3';
    ctx.shadowBlur = h * 0.012;
    ctx.fillRect(w / 2 - tw / 2, uy, tw, Math.max(3, h * 0.006));
    ctx.shadowBlur = 0;
  }
}

/**
 * Renders the full poster.
 * state: { layout, grade, size, photos: Image[], panels: [{ photo, zoom, ox, oy }],
 *          title, subtitle, titleScale }
 */
export function renderCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const size = POSTER_SIZES[state.size] || POSTER_SIZES.square;
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  const W = canvas.width;
  const H = canvas.height;
  const gap = state.layout === 'bleed' ? 0 : Math.max(4, Math.round(Math.min(W, H) * 0.008)) / Math.min(W, H);

  // White poster paper, then the photo panels.
  ctx.fillStyle = '#fdfbf7';
  ctx.fillRect(0, 0, W, H);
  const rects = computePanels(state.layout, gap);
  const panels = state.panels || [];
  rects.forEach((r, i) => {
    const rx = r.x * W;
    const ry = r.y * H;
    const rw = r.w * W;
    const rh = r.h * H;
    const p = panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const img = state.photos && state.photos[p.photo];
    if (img) paintPhoto(ctx, img, rx, ry, rw, rh, p.zoom || 1, p.ox || 0, p.oy || 0);
    else paintPlaceholder(ctx, rx, ry, rw, rh);
  });

  paintGrade(ctx, W, H, state.grade);

  // Dark scrim at the foot so the caption reads over any photo.
  const bandH = H * 0.30;
  const scrim = ctx.createLinearGradient(0, H - bandH, 0, H);
  scrim.addColorStop(0, 'rgba(10,4,24,0)');
  scrim.addColorStop(1, 'rgba(10,4,24,0.78)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H - bandH, W, bandH);

  paintCaption(ctx, W, H, state.title, state.subtitle, state.titleScale);
  paintVignette(ctx, W, H);
  paintGrain(ctx, W, H);
  return canvas;
}
