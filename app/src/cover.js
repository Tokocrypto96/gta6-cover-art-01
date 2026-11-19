// Neon Coast — the cover engine. Draws a GTA-style multi-panel cover onto a
// 2D canvas: panel photos with crop and position, a Vice City sunset or neon
// grade, a white poster frame, bold gradient title lettering and a neon script
// subtitle, grain and a vignette. Pure canvas, no network, no libraries.

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  wide: { w: 1920, h: 1080, label: 'Wide 1920 x 1080' },
};

export const LAYOUTS = {
  grid4: { label: 'Grid 2 x 2', panels: 4 },
  hero3: { label: 'Hero + 3', panels: 4 },
  bleed: { label: 'Full bleed', panels: 1 },
  grid9: { label: 'Grid 3 x 3', panels: 9 },
};

export const GRADES = {
  sunset: { label: 'Sunset', top: 'rgba(255,170,90,0.00)', mid: 'rgba(255,110,70,0.28)', bottom: 'rgba(214,32,122,0.62)', wash: 'rgba(255,120,50,0.10)' },
  neon: { label: 'Neon night', top: 'rgba(0,230,255,0.10)', mid: 'rgba(190,40,255,0.30)', bottom: 'rgba(255,0,150,0.60)', wash: 'rgba(0,220,255,0.08)' },
  vice: { label: 'Vice City', top: 'rgba(140,0,255,0.14)', mid: 'rgba(220,30,220,0.32)', bottom: 'rgba(255,0,170,0.58)', wash: 'rgba(160,40,255,0.10)' },
  gold: { label: 'Golden hour', top: 'rgba(255,210,110,0.06)', mid: 'rgba(255,160,40,0.30)', bottom: 'rgba(255,110,0,0.55)', wash: 'rgba(255,180,60,0.12)' },
  noir: { label: 'Noir', top: 'rgba(200,200,220,0.05)', mid: 'rgba(90,90,120,0.25)', bottom: 'rgba(20,10,40,0.60)', wash: 'rgba(255,170,90,0.06)' },
};

/** Panel rectangles for a layout, as fractions of the canvas. Each rect is
 *  { x, y, w, h } in 0..1. A white frame gap separates the panels. */
export function panelRects(layout, frame) {
  const f = frame;
  const inset = (x, y, w, h) => ({ x: x + f, y: y + f, w: w - 2 * f, h: h - 2 * f });
  switch (layout) {
    case 'grid4':
      return [
        inset(0, 0, 0.5, 0.5), inset(0.5, 0, 0.5, 0.5),
        inset(0, 0.5, 0.5, 0.5), inset(0.5, 0.5, 0.5, 0.5),
      ];
    case 'hero3':
      return [
        inset(0, 0, 0.62, 1),
        inset(0.62, 0, 0.38, 1 / 3), inset(0.62, 1 / 3, 0.38, 1 / 3), inset(0.62, 2 / 3, 0.38, 1 / 3),
      ];
    case 'bleed':
      return [{ x: 0, y: 0, w: 1, h: 1 }];
    case 'grid9':
      return [
        inset(0, 0, 1 / 3, 1 / 3), inset(1 / 3, 0, 1 / 3, 1 / 3), inset(2 / 3, 0, 1 / 3, 1 / 3),
        inset(0, 1 / 3, 1 / 3, 1 / 3), inset(1 / 3, 1 / 3, 1 / 3, 1 / 3), inset(2 / 3, 1 / 3, 1 / 3, 1 / 3),
        inset(0, 2 / 3, 1 / 3, 1 / 3), inset(1 / 3, 2 / 3, 1 / 3, 1 / 3), inset(2 / 3, 2 / 3, 1 / 3, 1 / 3),
      ];
    default:
      return panelRects('grid4', frame);
  }
}

let grainTile = null;
function grainPattern(ctx) {
  if (grainTile) return grainTile;
  const t = document.createElement('canvas');
  t.width = 160; t.height = 160;
  const c = t.getContext('2d');
  const img = c.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 96 + Math.floor(Math.random() * 96);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  grainTile = ctx.createPattern(t, 'repeat');
  return grainTile;
}

/** Draws one photo into a rectangle, cover-fit, with a zoom and a pan offset
 *  (ox, oy in fractions of the rectangle, -0.5..0.5). */
function drawPhotoCover(ctx, img, rx, ry, rw, rh, zoom, ox, oy) {
  const scale = Math.max(rw / img.naturalWidth, rh / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const dx = rx + (rw - pw) / 2 + ox * rw;
  const dy = ry + (rh - ph) / 2 + oy * rh;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.restore();
}

/** Applies the grade: a sunset/neon gradient wash, then a vignette. */
function applyGrade(ctx, w, h, grade) {
  const g = GRADES[grade] || GRADES.sunset;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, g.top);
  grad.addColorStop(0.55, g.mid);
  grad.addColorStop(1, g.bottom);
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
  ctx.fillStyle = g.wash;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function applyVignette(ctx, w, h) {
  const r = Math.hypot(w, h) / 2;
  const v = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(8,2,18,0.34)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

function applyGrain(ctx, w, h) {
  const p = grainPattern(ctx);
  if (!p) return;
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = p;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Fits the title to the width and returns the font size to use. */
function fitTitleSize(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, sans-serif`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  return size;
}

/**
 * Draws the whole cover.
 * state: { layout, grade, size, photos: Image[], panels: [{photo, zoom, ox, oy}],
 *          title, subtitle, titleScale }
 * A panel with no photo draws a deep purple placeholder with a palm-sun mark.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const size = SIZES[state.size] || SIZES.square;
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w; canvas.height = size.h;
  }
  const W = canvas.width, H = canvas.height;
  const frame = state.layout === 'bleed' ? 0 : Math.max(4, Math.round(Math.min(W, H) * 0.008));

  // White poster paper, then the panels.
  ctx.fillStyle = '#fdfbf7';
  ctx.fillRect(0, 0, W, H);
  const rects = panelRects(state.layout, frame / Math.min(W, H));
  const panels = state.panels || [];
  rects.forEach((r, i) => {
    const rx = r.x * W, ry = r.y * H, rw = r.w * W, rh = r.h * H;
    const p = panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const img = state.photos && state.photos[p.photo];
    if (img) {
      drawPhotoCover(ctx, img, rx, ry, rw, rh, p.zoom || 1, p.ox || 0, p.oy || 0);
    } else {
      ctx.fillStyle = '#2a1245';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.fillStyle = '#ff5e8a';
      ctx.beginPath();
      ctx.arc(rx + rw / 2, ry + rh * 0.42, Math.min(rw, rh) * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  applyGrade(ctx, W, H, state.grade);

  // Dark scrim along the foot so the lettering reads over any photo.
  const bandH = H * 0.30;
  const scrim = ctx.createLinearGradient(0, H - bandH, 0, H);
  scrim.addColorStop(0, 'rgba(10,4,24,0)');
  scrim.addColorStop(1, 'rgba(10,4,24,0.78)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H - bandH, W, bandH);

  // Subtitle in neon script, then the big gradient title.
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const pad = W * 0.045;
  const baseSize = H * 0.115 * (state.titleScale || 1);
  let titleSize = 0;
  if (title) titleSize = fitTitleSize(ctx, title, W - pad * 2, baseSize);
  const titleY = H - H * 0.055;
  if (subtitle) {
    const subSize = Math.max(18, Math.round(H * 0.042));
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = '#ff2fb3';
    ctx.shadowBlur = subSize * 0.55;
    ctx.fillStyle = '#ff7ae0';
    ctx.fillText(subtitle, W / 2, titleY - titleSize - H * 0.012);
    ctx.shadowBlur = 0;
  }
  if (title) {
    ctx.font = `${titleSize}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const tg = ctx.createLinearGradient(0, titleY - titleSize, 0, titleY);
    tg.addColorStop(0, '#ffe27a');
    tg.addColorStop(0.45, '#ff9e57');
    tg.addColorStop(0.75, '#ff5e8a');
    tg.addColorStop(1, '#c65df0');
    ctx.lineWidth = Math.max(2, titleSize * 0.045);
    ctx.strokeStyle = 'rgba(18,4,32,0.9)';
    ctx.lineJoin = 'round';
    ctx.strokeText(title, W / 2, titleY);
    ctx.fillStyle = tg;
    ctx.shadowColor = 'rgba(255,60,160,0.55)';
    ctx.shadowBlur = titleSize * 0.18;
    ctx.fillText(title, W / 2, titleY);
    ctx.shadowBlur = 0;
    // Neon underline accent.
    const tw = ctx.measureText(title).width;
    const uy = titleY + H * 0.018;
    ctx.fillStyle = '#ff2fb3';
    ctx.shadowColor = '#ff2fb3';
    ctx.shadowBlur = H * 0.012;
    ctx.fillRect(W / 2 - tw / 2, uy, tw, Math.max(3, H * 0.006));
    ctx.shadowBlur = 0;
  }

  applyVignette(ctx, W, H);
  applyGrain(ctx, W, H);
  return canvas;
}
