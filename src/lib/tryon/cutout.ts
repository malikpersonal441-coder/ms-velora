/**
 * Prepares a jewellery image for overlay.
 * - A product's dedicated try-on PNG is used as is.
 * - Otherwise the product photo's plain background is removed by flood-filling from the
 *   borders. This only works for studio shots on a plain background; busy photos are reported
 *   as such instead of pretending the cut-out is clean.
 */
export interface PreparedJewel {
  canvas: HTMLCanvasElement;
  source: 'try-on-image' | 'auto-cutout';
  /** False when the photo background was too busy to remove reliably. */
  clean: boolean;
}

const MAX = 700;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the jewellery image.'));
    img.src = url;
  });
}

function toCanvas(img: HTMLImageElement) {
  const s = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.naturalWidth * s));
  c.height = Math.max(1, Math.round(img.naturalHeight * s));
  c.getContext('2d', { willReadFrequently: true })!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** Crops transparent margins so the anchor maths works on the jewellery itself. */
function trim(c: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return c;
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out.getContext('2d')!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

function removeBackground(c: HTMLCanvasElement): { canvas: HTMLCanvasElement; clean: boolean; bg: number[] } {
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const { data, width: w, height: h } = img;

  // Sample the border to learn the background colour and how uniform it is
  const border: number[][] = [];
  const step = Math.max(1, Math.floor((w + h) / 200));
  for (let x = 0; x < w; x += step) border.push([x, 0], [x, h - 1]);
  for (let y = 0; y < h; y += step) border.push([0, y], [w - 1, y]);
  const cols = border.map(([x, y]) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  });
  const mean = [0, 1, 2].map((k) => cols.reduce((s, c) => s + c[k], 0) / cols.length);
  const spread = Math.sqrt(cols.reduce((s, c) => s + (c[0] - mean[0]) ** 2 + (c[1] - mean[1]) ** 2 + (c[2] - mean[2]) ** 2, 0) / cols.length);
  const clean = spread < 38;

  // Flood fill from every border pixel that resembles the background
  const tol = Math.max(30, Math.min(70, spread * 1.6 + 26));
  const near = (i: number) =>
    Math.hypot(data[i] - mean[0], data[i + 1] - mean[1], data[i + 2] - mean[2]) < tol;
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop()!;
    if (seen[p]) continue;
    seen[p] = 1;
    if (!near(p * 4)) continue;
    data[p * 4 + 3] = 0;
    const x = p % w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (p >= w) stack.push(p - w);
    if (p < w * (h - 1)) stack.push(p + w);
  }
  // Soften the cut edge by half-fading pixels that touch the removed background
  for (let p = w; p < w * (h - 1); p++) {
    if (data[p * 4 + 3] === 0) continue;
    if (data[(p - 1) * 4 + 3] === 0 || data[(p + 1) * 4 + 3] === 0 || data[(p - w) * 4 + 3] === 0 || data[(p + w) * 4 + 3] === 0) {
      data[p * 4 + 3] = 130;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { canvas: c, clean, bg: mean };
}

/**
 * Clears opaque islands that are not the jewellery. Islands are scored by how far their colours
 * sit from the photo background (`bg`), so a large patch of fabric shadow loses to a small gold
 * earring. `single` keeps only the best island: product photos usually show a pair of earrings
 * and each ear must get one.
 */
function keepMainParts(c: HTMLCanvasElement, single: boolean, bg?: number[]): HTMLCanvasElement {
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const { data, width: w, height: h } = img;
  const label = new Int32Array(w * h).fill(-1);
  const sizes: number[] = [];
  const scores: number[] = [];
  const sats: number[] = []; // mean saturation per island
  const away = (i: number) =>
    bg ? Math.min(160, Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2])) : 100;
  const saturation = (i: number) => {
    const mx = Math.max(data[i], data[i + 1], data[i + 2]);
    return mx ? (mx - Math.min(data[i], data[i + 1], data[i + 2])) / mx : 0;
  };
  const stack: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (label[start] !== -1 || data[start * 4 + 3] <= 24) continue;
    const id = sizes.length;
    let size = 0;
    let score = 0;
    let sat = 0;
    stack.push(start);
    label[start] = id;
    while (stack.length) {
      const p = stack.pop()!;
      size++;
      score += away(p * 4);
      sat += saturation(p * 4);
      const x = p % w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
        if (q >= 0 && q < w * h && label[q] === -1 && data[q * 4 + 3] > 24) {
          label[q] = id;
          stack.push(q);
        }
      }
    }
    sizes.push(size);
    sats.push(sat / size);
    // Colour matters too: grey folds and shadows of the backdrop are big but colourless
    scores.push(score * (0.25 + sat / size));
  }
  if (sizes.length <= 1) return c;
  const best = scores.indexOf(Math.max(...scores));
  // Drop islands close to the background colour, and colourless ones when the piece itself is colourful
  const backdrop = (id: number) => scores[id] / sizes[id] < 45 * (0.25 + sats[id]) || (sats[best] >= 0.3 && sats[id] < 0.15);
  const keep = (id: number) => (single ? id === best : scores[id] >= scores[best] * 0.04 && !backdrop(id));
  for (let p = 0; p < w * h; p++) {
    if (label[p] >= 0 && !keep(label[p])) data[p * 4 + 3] = 0;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

const memo = new Map<string, Promise<PreparedJewel>>();

/** `single`: keep one piece out of a photographed pair (earrings). */
export function prepareJewel(mainImage: string, tryOnImage?: string, single = false): Promise<PreparedJewel> {
  const key = `${tryOnImage || mainImage}|${single}`;
  if (!memo.has(key)) {
    const p = (async (): Promise<PreparedJewel> => {
      if (tryOnImage) {
        const c = toCanvas(await loadImage(tryOnImage));
        return { canvas: trim(single ? keepMainParts(c, true) : c), source: 'try-on-image', clean: true };
      }
      const { canvas, clean, bg } = removeBackground(toCanvas(await loadImage(mainImage)));
      return { canvas: trim(keepMainParts(canvas, single, bg)), source: 'auto-cutout', clean };
    })();
    p.catch(() => memo.delete(key));
    memo.set(key, p);
  }
  return memo.get(key)!;
}
