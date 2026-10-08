import { SYMBOL, TILE } from './geometry';

const f = (n: number) => n.toFixed(5);
const { ring, dot, field } = SYMBOL;

export const VERTEX = /* glsl */ `#version 300 es
in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;

/*
  One raymarched object described by signed distance fields, so it can change topology:
  seed → shell turning open over a sand core → official C with the meeting point → a thin
  machined tile with the C in relief → flat symbol, identical to logo.svg at the hand-off.

  The world around it is a drafting floor: a perspective grid the object rests on, which
  folds up into the flat page grid as the camera becomes orthographic for the hand-off.
  Light is a studio rig that travels with the camera (key softbox, rim strip, top fill), so
  reflections define the form instead of a single broad gradient.
*/
export const FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec3 uPlace;      // object centre on screen (device px, bottom-left) · device px per unit
uniform vec4 uShape;      // open, split, dot, tile
uniform float uFlat;
uniform mat3 uCamera;     // world-space camera basis: right, up, back
uniform vec4 uLens;       // focus distance · orthographic blend · floor fold (0 floor → 1 page) · floor visibility
uniform vec4 uGrid;
uniform float uBound;    // radius enclosing the object at its current stage       // cell (units) · page alignment x · page alignment y · floor height
uniform sampler2D uField; // official C, signed distance (scripts/bake-symbol-sdf.mjs)
out vec4 outColor;

const vec2 RING = vec2(${f(ring.x)}, ${f(ring.y)});
const float OUTER = ${f(ring.outer)};
const float INNER = ${f(ring.inner)};
const vec3 DOT = vec3(${f(dot.x)}, ${f(dot.y)}, ${f(dot.r)});
const float TILE_HALF = ${f(SYMBOL.tileHalf)};
const float TILE_RADIUS = ${f(SYMBOL.tileRadius)};
const vec4 FIELD = vec4(${f(field.x0)}, ${f(field.y0)}, ${f(field.size)}, ${f(field.range)});
const vec2 TILE_CENTRE = vec2(${f(TILE.cx)}, ${f(TILE.cy)});
const float PI = 3.14159265;

// Brand colours, linear (sRGB #183255 navy, #E8D8C5 sand, #F8F6F0 off-white).
const vec3 NAVY = vec3(0.00913, 0.03190, 0.09084);
const vec3 SAND = vec3(0.80695, 0.68669, 0.55830);
const vec3 OFF_WHITE = vec3(0.93869, 0.92158, 0.87137);
const vec3 NAVY_SRGB = vec3(0.0941, 0.1961, 0.3333);
const vec3 OFF_WHITE_SRGB = vec3(0.9725, 0.9647, 0.9412);

float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
float smax(float a, float b, float k) { float h = clamp(0.5 - 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) + k * h * (1.0 - h); }

// The official C in world units: exact outline from the baked field.
float sdC(vec2 p) {
  vec2 s = vec2(p.x * 100.0 + TILE_CENTRE.x, TILE_CENTRE.y - p.y * 100.0);
  vec2 uv = (s - FIELD.xy) / FIELD.z;
  float d = texture(uField, clamp(uv, 0.002, 0.998)).r * FIELD.w;
  vec2 outside = (abs(uv - 0.5) - 0.5) * FIELD.z;
  return (d + max(max(outside.x, outside.y), 0.0)) * 0.01;
}
float sdRoundRect(vec2 p, float half_, float r) {
  vec2 q = abs(p) - vec2(half_ - r);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
// Extrudes a 2D outline with a filleted profile; the widest section equals the outline.
float extrude(float d2, float z, float halfDepth, float round_) {
  vec2 w = vec2(d2 + round_, abs(z) - halfDepth + round_);
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - round_;
}

// Stage values that depend only on uniforms: computed once per pixel in prepare(), not in
// every distance evaluation (map() runs well over a hundred times per pixel).
vec3 gAxis; vec3 gDot;
float gHole, gSink, gWithdraw, gSquare, gFootGrow, gShift, gDepth, gRelief, gEdge, gRise, gThin, gDotR, gDisc, gSplitK, gBlend;
const float SEAM_ALONG = ${f(Math.sqrt(ring.outer * ring.outer - ring.inner * ring.inner))};

void prepare() {
  float open = uShape.x, split = uShape.y, emerge = uShape.z, tile = uShape.w;
  float turn = mix(1.92, 0.0, smoothstep(0.08, 1.0, open));
  gAxis = normalize(vec3(-sin(turn), 0.1 * sin(turn), cos(turn)));
  gHole = mix(-0.08, INNER, smoothstep(0.0, 0.55, open));
  gSplitK = 0.012 * split + 0.001;
  gSink = smoothstep(0.0, 0.7, tile);
  // Tile: a thin machined slab with a small chamfer-like fillet, not a cushion.
  gDepth = mix(0.085, 0.022, uFlat);
  gRelief = mix(0.042, 0.008, uFlat);
  gEdge = mix(0.034, 0.012, uFlat);
  gWithdraw = smoothstep(0.36, 0.66, tile);
  gSquare = smoothstep(0.05, 0.85, tile);
  gFootGrow = mix(0.6, 0.0, smoothstep(0.0, 0.35, tile));
  gShift = mix(0.45, 0.0, smoothstep(0.0, 0.6, tile));
  gBlend = 0.06 * (1.0 - uFlat) + 0.001;
  gRise = mix(-1.6 * gRelief - 0.045, 0.0, smoothstep(0.3, 0.66, tile));
  gThin = mix(0.09, 0.0, smoothstep(0.34, 0.7, tile));
  gDot = mix(vec3(0.5, -0.12, -0.32), vec3(DOT.xy, 0.38), emerge);
  gDotR = DOT.z * mix(0.55, 1.0, emerge);
  gDisc = smoothstep(0.35, 0.9, tile);
}

// x: distance · y: material (0 navy, 1 sand core / off-white relief, 2 meeting point).
// Branches test uniforms only, so every pixel takes the same path: skipped stages cost nothing.
vec2 map(vec3 p) {
  float split = uShape.y, emerge = uShape.z, tile = uShape.w;
  vec3 q = p - vec3(RING, 0.0);
  vec3 qs = q + vec3(0.0, 0.0, 1.25 * gSink);  // the domed C presses back into the tile

  float navy = 1e3, cream = 1e3, raised = 0.0;
  // Once the C has pressed fully into the slab (and the core has sunk), neither can be seen.
  if (gSink < 1.0) {
    // Seed and shell. The aperture dilates from the far-left limb and turns to face the
    // viewer. An engraved seam marks, from the first frame, where the seed will open.
    float along = dot(qs, gAxis);
    float radial = length(qs - gAxis * along);
    float shell = smax(length(qs) - OUTER, -max(radial - gHole, -along), 0.016);
    shell = smax(shell, -(length(vec2(radial - INNER, along - SEAM_ALONG)) - 0.007), 0.004);
    // The rim parts into the official C; the gap grows from the right.
    navy = split > 0.0 ? smax(shell, mix(-0.7, sdC(p.xy), split), gSplitK) : shell;
  }
  if (gWithdraw < 1.0) cream = length(q - vec3(0.0, 0.0, -0.05 - 1.1 * gWithdraw)) - mix(0.8, -0.05, gWithdraw);

  if (tile > 0.0) {
    // The slab grows from behind as a squircle (circle → official rounded square) while the
    // C presses into it and the sand core stays in view; then the core sinks as the C rises
    // out of the slab's face: the sand moves from the dome into the mark.
    float foot = mix(length(p.xy - RING) - OUTER, sdRoundRect(p.xy, TILE_HALF, TILE_RADIUS), gSquare) + gFootGrow;
    navy = smin(navy, extrude(foot, p.z + gShift, gDepth, gEdge), gBlend);
    raised = p.z - (gDepth - gShift) - gRelief - gRise;
    if (tile >= 0.3) cream = min(cream, extrude(sdC(p.xy) + gThin, raised, gRelief, gRelief * 0.45));
  }

  vec2 res = vec2(navy, 0.0);
  if (cream < res.x) res = vec2(cream, 1.0);
  if (emerge > 0.0) {
    // The meeting point comes forward from behind the core, settles in the gap, then lands
    // on the tile with the C.
    float point = length(p - gDot) - gDotR;
    if (tile > 0.0) point = mix(point, extrude(length(p.xy - DOT.xy) - DOT.z, raised, gRelief, gRelief * 0.45), gDisc);
    if (point < res.x) res = vec2(point, 2.0);
  }
  return res;
}

vec3 normalAt(vec3 p, float e) {
  const vec2 k = vec2(1.0, -1.0);
  return normalize(k.xyy * map(p + k.xyy * e).x + k.yyx * map(p + k.yyx * e).x +
                   k.yxy * map(p + k.yxy * e).x + k.xxx * map(p + k.xxx * e).x);
}
float softShadow(vec3 ro, vec3 rd, float k) {
  float res = 1.0, t = 0.02;
  for (int i = 0; i < 12; i++) {
    float h = map(ro + rd * t).x;
    res = min(res, k * h / t);
    t += clamp(h, 0.035, 0.32);
    if (res < 0.002 || t > 3.5) break;
  }
  return clamp(res, 0.0, 1.0);
}
float occlusion(vec3 p, vec3 n) {
  float o = 0.0, w = 1.0;
  for (int i = 1; i <= 3; i++) { float h = 0.04 * float(i); o += (h - map(p + n * h).x) * w; w *= 0.6; }
  return clamp(1.0 - 2.6 * o, 0.0, 1.0);
}

float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise3(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}

// Studio rig in camera space (x right, y up, z towards the viewer). Softboxes are angular
// rectangles; roughness widens their edges.
float softbox(vec3 d, vec3 c, vec2 size, float soft) {
  float k = dot(d, c);
  if (k <= 0.0) return 0.0;
  vec3 u = normalize(cross(vec3(0.0, 1.0, 0.0001), c)), v = cross(c, u);
  vec2 g = abs(vec2(dot(d, u), dot(d, v)) / k);
  vec2 e = smoothstep(size + soft, size - soft, g);
  return e.x * e.y;
}
const vec3 KEY = vec3(-0.55, 0.62, 0.56);
vec3 environment(vec3 d, float rough) {
  float soft = mix(0.04, 0.5, rough);
  vec3 col = mix(vec3(0.62, 0.55, 0.47) * 0.32, vec3(0.94, 0.95, 0.97) * 0.42, smoothstep(-0.4, 0.7, d.y));
  col += vec3(1.0, 0.98, 0.95) * 2.6 * softbox(d, normalize(KEY), vec2(0.75, 0.34), soft);
  col += vec3(0.9, 0.94, 1.0) * 2.2 * softbox(d, normalize(vec3(0.92, 0.12, -0.32)), vec2(0.07, 0.95), soft);
  col += vec3(1.0) * 1.1 * softbox(d, normalize(vec3(0.0, 1.0, 0.2)), vec2(0.45, 0.45), soft);
  return col;
}

vec3 toSRGB(vec3 c) {
  c = max(c, 0.0);
  c = mix(c, 0.82 + 0.18 * (1.0 - exp(-(c - 0.82) / 0.18)), step(0.82, c)); // soft shoulder
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float hash2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

// Anti-aliased grid: major cells plus quarter-cell minor lines that fade out as they become
// denser than the pixel grid can carry. Derivatives are taken in uniform control flow.
float gridLines(vec2 g, float cell) {
  vec2 w = fwidth(g);
  vec2 major = abs(fract(g / cell + 0.5) - 0.5) * cell / max(w, 1e-5);
  float lineMajor = 1.0 - min(min(major.x, major.y), 1.0);
  float minorCell = cell * 0.25;
  vec2 minor = abs(fract(g / minorCell + 0.5) - 0.5) * minorCell / max(w, 1e-5);
  float density = smoothstep(0.2, 0.09, max(w.x, w.y) / minorCell);
  float lineMinor = (1.0 - min(min(minor.x, minor.y), 1.0)) * density * 0.5;
  float fadeFar = 1.0 - smoothstep(0.22, 0.55, max(w.x, w.y) / cell);
  return max(lineMajor, lineMinor) * fadeFar;
}

void main() {
  prepare();
  float unit = 1.0 / uPlace.z;                       // world units per device pixel at the focus plane
  vec2 uv = (gl_FragCoord.xy - uPlace.xy) * unit;
  vec3 right = uCamera[0], up = uCamera[1], back = uCamera[2];
  float dist = uLens.x, ortho = uLens.y;
  vec3 lateral = right * uv.x + up * uv.y;
  vec3 ro = back * dist + lateral * ortho;
  vec3 rd = normalize(-back * dist + lateral * (1.0 - ortho));
  mat3 toCamera = transpose(uCamera);
  vec3 keyW = uCamera * normalize(KEY);

  // Drafting floor, evaluated first in uniform control flow (grid derivatives).
  float fold = uLens.z * 0.5 * PI;
  vec3 hinge = vec3(0.0, uGrid.w, -1.35);
  vec3 along = vec3(0.0, sin(fold), -cos(fold));
  vec3 normal = vec3(0.0, cos(fold), sin(fold));
  float denom = dot(rd, normal);
  float tf = dot(hinge - ro, normal) / (abs(denom) > 1e-4 ? denom : 1e-4);
  vec3 pf = ro + rd * tf;
  float sAlong = dot(pf - hinge, along);
  float lines = gridLines(vec2(pf.x - uGrid.y, sAlong - uGrid.z), uGrid.x);

  // Object.
  float alpha = 0.0, tHit = 1e9;
  vec3 colour = vec3(0.0);
  float b = dot(ro, rd);
  float disc = b * b - dot(ro, ro) + uBound * uBound;
  if (disc > 0.0) {
    float t = max(-b - sqrt(disc), 0.0), tEnd = -b + sqrt(disc);
    float closest = 1e9, tClosest = t;
    bool hit = false;
    for (int i = 0; i < 72; i++) {
      float pixel = unit * mix(t / dist, 1.0, ortho);   // pixel footprint at this depth
      float d = map(ro + rd * t).x;
      if (d / pixel < closest) { closest = d / pixel; tClosest = t; }
      if (d < 0.3 * pixel) { hit = true; break; }
      t += d * 0.94;
      if (t > tEnd) break;
    }
    // Coverage centred on the true edge, measured in pixels.
    alpha = hit ? 1.0 : clamp(0.5 - closest, 0.0, 1.0);
    if (alpha > 0.0) {
      tHit = hit ? t : tClosest;
      vec3 p = ro + rd * tHit;
      vec2 m = map(p);
      float pixel = unit * mix(tHit / dist, 1.0, ortho);
      vec3 n = normalAt(p, max(0.6 * pixel, 0.0012));
      float tile = uShape.w;
      bool isNavy = m.y < 0.5 || (m.y > 1.5 && tile < 0.5);
      // Bead-blasted grain on navy, visible only in highlights; it fades before it can alias.
      float grain = isNavy ? 0.03 * (1.0 - smoothstep(0.004, 0.009, pixel)) * (1.0 - uFlat) : 0.0;
      if (grain > 0.0) n = normalize(n + grain * (vec3(noise3(p * 46.0), noise3(p * 46.0 + 17.3), noise3(p * 46.0 + 31.7)) - 0.5));
      vec3 v = -rd;
      vec3 nc = toCamera * n, vc = toCamera * v;

      vec3 coreTone = mix(SAND, OFF_WHITE, smoothstep(0.2, 1.0, tile));
      vec3 pointTone = mix(NAVY, OFF_WHITE, smoothstep(0.35, 0.9, tile));
      vec3 albedo = m.y < 0.5 ? NAVY * 1.25 : (m.y < 1.5 ? coreTone : pointTone * mix(1.25, 1.0, smoothstep(0.35, 0.9, tile)));
      float rough = m.y < 0.5 ? 0.5 : (m.y < 1.5 ? 0.58 : 0.42);
      vec3 flatTone = m.y < 0.5 ? NAVY_SRGB : OFF_WHITE_SRGB;

      // No shadow ray for surfaces turned away from the key: the wrap term already darkens them.
      float shade = dot(n, keyW) < -0.25 ? 0.0 : softShadow(p + n * 0.01, keyW, m.y > 0.5 && m.y < 1.5 ? 5.0 : 9.0);
      float ao = occlusion(p, n);
      float soft = m.y > 0.5 && m.y < 1.5 ? 0.8 : 0.35;     // sand is lit softly, navy keeps its terminator
      float wrap = clamp((dot(n, keyW) + soft) / (1.0 + soft), 0.0, 1.0);
      shade = mix(shade, 1.0, soft - 0.35);
      vec3 hemi = mix(vec3(0.66, 0.58, 0.49), vec3(0.93, 0.94, 0.97), 0.5 + 0.5 * nc.y);
      vec3 diffuse = albedo * (wrap * shade * vec3(1.0, 0.98, 0.95) * 1.05 + hemi * 0.36) * ao;
      // Fresnel-weighted studio reflections define edges and curvature.
      float fresnel = 0.04 + 0.96 * pow(1.0 - max(dot(nc, vc), 0.0), 5.0);
      vec3 reflection = environment(reflect(-vc, nc), rough) * fresnel * mix(1.0, 0.45, rough) * mix(0.55, 1.0, shade) * ao;
      colour = mix(toSRGB(diffuse + reflection), flatTone, smoothstep(0.3, 1.0, uFlat));
    }
  }

  // Floor: grid lines plus a soft contact shadow; it folds into the page at the hand-off.
  float floorAlpha = 0.0;
  vec3 floorColour = NAVY_SRGB;
  if (uLens.w > 0.0 && tf > 0.0 && tf < tHit && abs(denom) > 1e-4) {
    float reach = 1.0 - smoothstep(2.4, 6.2, length(vec2(pf.x, sAlong + 1.35)));
    floorAlpha = lines * 0.12 * mix(reach, 1.0, uLens.z * 0.55) * uLens.w;
    // Contact shadow from a single distance sample above the floor point: most shaded
    // pixels are floor, so this must stay one evaluation, and only near the object.
    if (length(vec2(pf.x, sAlong + 1.35)) < 2.0 && uLens.z < 1.0) {
      vec3 ls = normalize(vec3(-0.25, 1.0, 0.45));
      float occ = clamp((map(pf + ls * 0.32).x + 0.04) / 0.42, 0.0, 1.0);
      float shadow = (1.0 - occ) * 0.26 * (1.0 - uLens.z) * uLens.w;
      floorColour = mix(NAVY_SRGB, vec3(0.09, 0.14, 0.22), shadow / max(shadow + floorAlpha, 1e-4));
      floorAlpha = floorAlpha + shadow * (1.0 - floorAlpha);
    }
  }

  // At the hand-off the symbol is a flat, frontal figure: resolve it analytically in 2D with
  // per-pixel coverage, the way the browser rasterises logo.svg, so the swap is exact.
  float exact = smoothstep(0.86, 1.0, uFlat) * ortho;
  if (exact > 0.0) {
    float tileCover = clamp(0.5 - sdRoundRect(uv, TILE_HALF, TILE_RADIUS) / unit, 0.0, 1.0);
    float markCover = clamp(0.5 - min(sdC(uv), length(uv - DOT.xy) - DOT.z) / unit, 0.0, 1.0);
    colour = mix(colour, mix(NAVY_SRGB, OFF_WHITE_SRGB, markCover), exact);
    alpha = mix(alpha, tileCover, exact);
  }
  float dither = (hash2(gl_FragCoord.xy) - 0.5) / 255.0;
  float a = alpha + floorAlpha * (1.0 - alpha);
  outColor = vec4((colour + dither * (1.0 - uFlat)) * alpha + floorColour * floorAlpha * (1.0 - alpha), a);
}`;
