// Bakes the official C of the Connections Hub symbol into a signed distance field.
// Source: public/brand/logo.svg (unchanged official file). Output: public/sdf/symbol-c.png.
//
// The 3D scene extrudes this field, so the C it renders is the brand's own outline,
// not a redrawn approximation. Run with `npm run bake`.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Symbol frame in logo.svg units: the tile is 282.78 square at (0, 28.05).
export const SYMBOL = { cx: 141.39, cy: 169.44, half: 141.39, radius: 72.76 };
const HALF_DOMAIN = 162;      // tile half-size plus margin, in SVG units
const MASTER = 2048;          // rasterisation resolution for the exact transform
const SIZE = 256;             // stored texture resolution
const RANGE = 162;            // encoded distance range, ± SVG units (whole domain, no clamping)

const source = await fs.readFile(path.resolve('public/brand/logo.svg'), 'utf8');
// The C is the off-white path inside the symbol (class cls-3, starts at x < 282).
const cPath = [...source.matchAll(/<path class="cls-3" d="([^"]+)"/g)].map(m => m[1]).find(d => parseFloat(d.slice(1)) < 282);
if (!cPath) throw new Error('Official C path not found in logo.svg');

const x0 = SYMBOL.cx - HALF_DOMAIN;
const y0 = SYMBOL.cy - HALF_DOMAIN;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MASTER}" height="${MASTER}" viewBox="${x0} ${y0} ${HALF_DOMAIN * 2} ${HALF_DOMAIN * 2}"><rect x="${x0}" y="${y0}" width="${HALF_DOMAIN * 2}" height="${HALF_DOMAIN * 2}" fill="#000"/><path d="${cPath}" fill="#fff"/></svg>`;
const { data } = await sharp(Buffer.from(svg)).greyscale().raw().toBuffer({ resolveWithObject: true });

// Felzenszwalb & Huttenlocher exact squared Euclidean distance transform.
const INF = 1e20;
function edt1d(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
}
function edt(grid, n) {
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < n; x++) { for (let y = 0; y < n; y++) f[y] = grid[y * n + x]; edt1d(f, n, d, v, z); for (let y = 0; y < n; y++) grid[y * n + x] = d[y]; }
  for (let y = 0; y < n; y++) { for (let x = 0; x < n; x++) f[x] = grid[y * n + x]; edt1d(f, n, d, v, z); for (let x = 0; x < n; x++) grid[y * n + x] = d[x]; }
  return grid;
}
const n = MASTER;
const outside = new Float64Array(n * n);
const inside = new Float64Array(n * n);
for (let i = 0; i < n * n; i++) {
  // Anti-aliased coverage, thresholded at 50%: the outline sits on the half-coverage edge.
  const isIn = data[i] >= 128;
  outside[i] = isIn ? 0 : INF;
  inside[i] = isIn ? INF : 0;
}
edt(outside, n); edt(inside, n);
const unitsPerPixel = (HALF_DOMAIN * 2) / n;
const signed = i => (Math.sqrt(outside[i]) - Math.sqrt(inside[i])) * unitsPerPixel;

// Point-sample the master field at texel centres (the field is smooth, no aliasing).
// 16-bit fixed point split across R (high byte) and G (low byte): 8 bits alone quantise
// the gradient enough to show as wrinkles in the shading. Decoded to a float texture at load.
const out = Buffer.alloc(SIZE * SIZE * 3);
for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
  const mx = Math.min(n - 1, Math.round((x + 0.5) * n / SIZE - 0.5));
  const my = Math.min(n - 1, Math.round((y + 0.5) * n / SIZE - 0.5));
  const d = signed(my * n + mx);
  const v = Math.round(Math.min(1, Math.max(0, 0.5 + d / (2 * RANGE))) * 65535);
  const i = (y * SIZE + x) * 3;
  out[i] = v >> 8; out[i + 1] = v & 255; out[i + 2] = 0;
}
await fs.mkdir(path.resolve('public/sdf'), { recursive: true });
await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 3 } }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(path.resolve('public/sdf/symbol-c.png'));

// Measure the C's ring for the shell stages: outer/inner radius and centre, in SVG units.
let minX = n, minY = n, maxY = 0;
for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (data[y * n + x] >= 128) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
const outer = (maxY - minY) / 2 * unitsPerPixel;
const ringCy = y0 + (minY + maxY) / 2 * unitsPerPixel;
const ringCx = x0 + minX * unitsPerPixel + outer;
let innerX = Math.round((ringCx - x0) / unitsPerPixel);
const row = Math.round((ringCy - y0) / unitsPerPixel);
while (innerX > 0 && data[row * n + innerX] < 128) innerX--;
const inner = ringCx - (x0 + innerX * unitsPerPixel);
const stat = await fs.stat(path.resolve('public/sdf/symbol-c.png'));
console.log(JSON.stringify({ texture: 'public/sdf/symbol-c.png', bytes: stat.size, domain: { x0, y0, size: HALF_DOMAIN * 2 }, range: RANGE, ring: { cx: +ringCx.toFixed(2), cy: +ringCy.toFixed(2), outer: +outer.toFixed(2), inner: +inner.toFixed(2) } }));
