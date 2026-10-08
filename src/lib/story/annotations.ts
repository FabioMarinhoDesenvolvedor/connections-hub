import { project, type Camera, type Vec3 } from './camera';
import { LOGO, SYMBOL } from './geometry';
import type { Placement, Shape } from './timeline';

/*
  Drafting annotations for each beat. They state the official mark's real dimensions, in
  logo.svg units, at the moment each part forms: the seed already has the C's outer diameter,
  the aperture is the C's inner diameter, the meeting point is the stroke's width, the tile
  is the icon's size and corner radius. Geometry is projected through the story camera so
  lines sit on the rendered object.
*/
export type Annotation = { line: string; dash: string; label: { x: number; y: number; text: string; anchor: 'start' | 'middle' | 'end' }; anchor: { x: number; y: number } };

const R = SYMBOL.ring.outer;
const fmt = (n: number) => n.toFixed(2).replace('.', ',');
export const MEASURES = {
  outer: fmt(SYMBOL.ring.outer * 200),
  aperture: fmt(SYMBOL.ring.inner * 200),
  point: fmt(SYMBOL.dot.r * 200),
  tile: fmt(SYMBOL.tileHalf * 200),
  radius: fmt(SYMBOL.tileRadius * 100),
};

const tick = (x: number, y: number, size = 5) => `M${x - size} ${y + size}L${x + size} ${y - size}`;

export function annotate(index: number, shape: Shape, camera: Camera, placement: Placement): Annotation {
  const at = (p: Vec3) => project(p, camera, placement);
  if (index === 0) {
    // Ø of the seed = outer diameter of the C.
    const y = R + 0.13;
    const a = at([-R, y, 0]), b = at([R, y, 0]);
    const a0 = at([-R, R * 0.45, 0]), b0 = at([R, R * 0.45, 0]);
    const a1 = at([-R, y + 0.05, 0]), b1 = at([R, y + 0.05, 0]);
    return {
      line: `M${a0.x} ${a0.y}L${a1.x} ${a1.y}M${b0.x} ${b0.y}L${b1.x} ${b1.y}M${a.x} ${a.y}L${b.x} ${b.y}${tick(a.x, a.y)}${tick(b.x, b.y)}`,
      dash: '',
      label: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 10, text: `Ø ${MEASURES.outer}`, anchor: 'middle' },
      anchor: a,
    };
  }
  if (index === 1) {
    // The aperture: the seam circle the shell opens to, Ø = inner diameter of the C.
    const turn = 1.92 * (1 - smoothstep(0.08, 1, shape.open));
    const axis = normalise([-Math.sin(turn), 0.1 * Math.sin(turn), Math.cos(turn)]);
    const u = normalise(cross(axis, [0, 1, 0]));
    const v = cross(axis, u);
    const rim = Math.sqrt(R * R - SYMBOL.ring.inner * SYMBOL.ring.inner);
    const centre: Vec3 = [axis[0] * rim, axis[1] * rim, axis[2] * rim];
    const point = (angle: number) => at([
      centre[0] + (u[0] * Math.cos(angle) + v[0] * Math.sin(angle)) * SYMBOL.ring.inner,
      centre[1] + (u[1] * Math.cos(angle) + v[1] * Math.sin(angle)) * SYMBOL.ring.inner,
      centre[2] + (u[2] * Math.cos(angle) + v[2] * Math.sin(angle)) * SYMBOL.ring.inner,
    ]);
    const ellipse = Array.from({ length: 49 }, (_, i) => point((i / 48) * Math.PI * 2));
    const c = at(centre);
    const edge = ellipse.reduce((best, p) => (p.x > best.x ? p : best), ellipse[0]);
    // The label sits clear of the shell: a short leader from the aperture to outside the seed.
    const outside = at([R * 0.86, R * 1.16, 0]);
    return {
      line: `M${c.x - 7} ${c.y}H${c.x + 7}M${c.x} ${c.y - 7}V${c.y + 7}M${edge.x} ${edge.y}L${outside.x} ${outside.y}H${outside.x + 18}`,
      dash: ellipse.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(''),
      label: { x: outside.x + 24, y: outside.y + 4, text: `Ø ${MEASURES.aperture} · abertura`, anchor: 'start' },
      anchor: { x: outside.x + 18, y: outside.y },
    };
  }
  if (index === 2) {
    // The meeting point: its path out of the core, and Ø = the C's stroke width.
    const from: Vec3 = [0.5, -0.12, -0.32];
    const to: Vec3 = [SYMBOL.dot.x, SYMBOL.dot.y, 0.38];
    const e = shape.dot;
    const now: Vec3 = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e, from[2] + (to[2] - from[2]) * e];
    const start = at(from), centre = at(now);
    const edge = at([now[0] + SYMBOL.dot.r * 1.9, now[1], now[2]]);
    const ring = Math.max(6, Math.hypot(edge.x - centre.x, edge.y - centre.y));
    // Ring around the point, then a leader out to the right where the chapter's copy sits.
    const knee = { x: centre.x + ring + 26, y: centre.y + ring + 26 };
    return {
      line: `M${centre.x - ring} ${centre.y}a${ring} ${ring} 0 1 0 ${ring * 2} 0a${ring} ${ring} 0 1 0 ${-ring * 2} 0M${centre.x + ring * 0.71} ${centre.y + ring * 0.71}L${knee.x} ${knee.y}H${knee.x + 16}`,
      dash: `M${start.x} ${start.y}L${centre.x} ${centre.y}`,
      label: { x: knee.x + 22, y: knee.y + 4, text: `Ø ${MEASURES.point} · ponto de encontro`, anchor: 'start' },
      anchor: { x: knee.x + 16, y: knee.y },
    };
  }
  // The tile: its width and corner radius, on the front face.
  const h = SYMBOL.tileHalf, r = SYMBOL.tileRadius, z = 0.085;
  const y = -h - 0.14;
  const a = at([-h, y, z]), b = at([h, y, z]);
  const a0 = at([-h, -h * 0.5, z]), b0 = at([h, -h * 0.5, z]);
  const a1 = at([-h, y - 0.05, z]), b1 = at([h, y - 0.05, z]);
  // The corner radius is traced on the front face itself.
  const arc = Array.from({ length: 13 }, (_, i) => {
    const t = (i / 12) * Math.PI / 2;
    return at([-(h - r + Math.cos(t) * r), h - r + Math.sin(t) * r, z]);
  });
  return {
    line: `M${a0.x} ${a0.y}L${a1.x} ${a1.y}M${b0.x} ${b0.y}L${b1.x} ${b1.y}M${a.x} ${a.y}L${b.x} ${b.y}${tick(a.x, a.y)}${tick(b.x, b.y)}`,
    dash: arc.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(''),
    label: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 20, text: `${MEASURES.tile} · R ${MEASURES.radius}`, anchor: 'middle' },
    anchor: arc[6],
  };
}

/**
  Construction lines of the lockup, from logo.svg itself: the tile's top meets the x-height of
  "connections", its bottom the baseline of "hub", and the name starts 67.6 units after it.
*/
export function construction(box: { left: number; top: number; width: number }) {
  const unit = box.width / LOGO.width;
  const x = (v: number) => box.left + v * unit;
  const y = (v: number) => box.top + v * unit;
  const reach = 48;
  const rows = [28.05, 131.24, 163.36, 310.83];
  const cols = [282.78, 350.4];
  const gapY = y(310.83) + 22;
  return {
    line: rows.map(r => `M${x(0) - reach} ${y(r)}H${x(LOGO.width) + reach}`).join('') + cols.map(c => `M${x(c)} ${y(0) - reach * 0.6}V${y(LOGO.height) + reach * 0.6}`).join(''),
    dimension: `M${x(282.78)} ${gapY}H${x(350.4)}${tick(x(282.78), gapY, 4)}${tick(x(350.4), gapY, 4)}`,
    label: { x: (x(282.78) + x(350.4)) / 2, y: gapY + 16, text: fmt(350.4 - 282.78) },
  };
}

function smoothstep(a: number, b: number, v: number) { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
function cross(a: Vec3, b: Vec3): Vec3 { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function normalise(a: Vec3): Vec3 { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
