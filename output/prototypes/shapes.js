// Exact 2D outlines in symbol units (tile half-size = 1), extruded with a bevel that starts
// inside the outline (bevelOffset = -bevelSize), so the frontal silhouette equals the outline.
import * as THREE from 'three';
import { SVGLoader } from './vendor/SVGLoader.js';
import { SYMBOL } from './stage.js';

const rad = d => d * Math.PI / 180;

export function extrude(shape, depth, bevel = 0.014, segments = 6) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, curveSegments: 1,
    bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: segments,
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

// Annular sector with round ends. sweep → 0 gives a disc of radius `half`.
export function capsuleArc({ cx = SYMBOL.centre.x, cy = SYMBOL.centre.y, radius, half, from, to, n = 120 }) {
  const pts = [];
  const a0 = rad(from), a1 = rad(to);
  const arcN = Math.max(2, Math.round(n * Math.abs(a1 - a0) / (2 * Math.PI)));
  const at = (r, a) => new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a));
  for (let i = 0; i <= arcN; i++) pts.push(at(radius + half, a0 + (a1 - a0) * i / arcN));
  const m1 = at(radius, a1);
  for (let i = 1; i < 64; i++) { const f = a1 + Math.PI * i / 64; pts.push(new THREE.Vector2(m1.x + half * Math.cos(f), m1.y + half * Math.sin(f))); }
  for (let i = 0; i <= arcN; i++) pts.push(at(radius - half, a1 + (a0 - a1) * i / arcN));
  const m0 = at(radius, a0);
  for (let i = 1; i < 64; i++) { const f = a0 + Math.PI + Math.PI * i / 64; pts.push(new THREE.Vector2(m0.x + half * Math.cos(f), m0.y + half * Math.sin(f))); }
  return new THREE.Shape(pts);
}

// Rounded square: corner === half gives a disc, corner = SYMBOL.corner gives the official tile.
export function roundedSquare({ cx = 0, cy = 0, half, corner, n = 28 }) {
  const r = Math.min(corner, half), s = half - r, pts = [];
  const corners = [[s, s, 0], [-s, s, 90], [-s, -s, 180], [s, -s, 270]];
  for (const [x, y, start] of corners) for (let i = 0; i <= n; i++) {
    const a = rad(start + 90 * i / n);
    pts.push(new THREE.Vector2(cx + x + r * Math.cos(a), cy + y + r * Math.sin(a)));
  }
  return new THREE.Shape(pts);
}

export function disc({ cx, cy, r, n = 160 }) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = 2 * Math.PI * i / n; pts.push(new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a))); }
  return new THREE.Shape(pts);
}

// The official C, read from the brand file and mapped into symbol units.
export async function officialC() {
  const text = await (await fetch('brand/symbol-navy.svg')).text();
  const data = new SVGLoader().parse(text);
  const path = data.paths.find(p => p.subPaths.some(s => s.getPoints().length > 20) && p.userData.node.tagName === 'path');
  const U = SYMBOL.unit;
  const shapes = SVGLoader.createShapes(path).map(shape => {
    const map = pts => pts.map(p => new THREE.Vector2((p.x - U) / U, -(p.y - U) / U));
    const s = new THREE.Shape(map(shape.getPoints(64)));
    s.holes = shape.holes.map(h => new THREE.Path(map(h.getPoints(64))));
    return s;
  });
  return shapes;
}

// Matte soft-touch: broad, low specular and a faint sheen at grazing angles. No clearcoat.
export function matte(color, { roughness = 0.62, sheen = 0.35 } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness, metalness: 0, sheen, sheenRoughness: 0.75,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.35), specularIntensity: 0.45,
  });
}
