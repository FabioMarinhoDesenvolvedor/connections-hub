import { SYMBOL, TILE } from './geometry';

const f = (n: number) => n.toFixed(5);
const { ring, dot, field } = SYMBOL;

export const VERTEX = /* glsl */ `#version 300 es
in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;

/*
  One raymarched object, described as signed distance fields so it can change topology:
  seed sphere → shell turning open over a sand core → C with the meeting point → tile with
  the C in relief → flat symbol, identical to logo.svg at the hand-off.
  Orthographic camera along -z; the object is placed in device pixels by uPlace.
*/
export const FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec3 uPlace;      // centre (device px, origin bottom-left), device px per unit
uniform vec4 uShape;      // open, split, dot, tile
uniform float uFlat;
uniform mat3 uToObject;   // world → object rotation
uniform sampler2D uField; // official C, signed distance (see scripts/bake-symbol-sdf.mjs)
out vec4 outColor;

const vec2 RING = vec2(${f(ring.x)}, ${f(ring.y)});
const float OUTER = ${f(ring.outer)};
const float INNER = ${f(ring.inner)};
const vec3 DOT = vec3(${f(dot.x)}, ${f(dot.y)}, ${f(dot.r)});
const float TILE_HALF = ${f(SYMBOL.tileHalf)};
const float TILE_RADIUS = ${f(SYMBOL.tileRadius)};
const vec4 FIELD = vec4(${f(field.x0)}, ${f(field.y0)}, ${f(field.size)}, ${f(field.range)});
const vec2 TILE_CENTRE = vec2(${f(TILE.cx)}, ${f(TILE.cy)});
const float BOUND = 1.82;

// Brand colours, linear (sRGB #183255 navy, #E8D8C5 sand, #F8F6F0 off-white).
const vec3 NAVY = vec3(0.00913, 0.03190, 0.09084);
const vec3 SAND = vec3(0.80695, 0.68669, 0.56471);
const vec3 OFF_WHITE = vec3(0.93869, 0.92158, 0.87137);

float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

float smax(float a, float b, float k) {
  float h = clamp(0.5 - 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) + k * h * (1.0 - h);
}

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

// Extrudes a 2D outline with a rounded profile; the widest section equals the outline.
float extrude(float d2, float z, float halfDepth, float round_) {
  vec2 w = vec2(d2 + round_, abs(z) - halfDepth + round_);
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - round_;
}

// x: distance; y: material (0 navy, 1 sand core / off-white relief, 2 meeting point).
vec2 map(vec3 p) {
  float open = uShape.x, split = uShape.y, emerge = uShape.z, tile = uShape.w;
  float sink = smoothstep(0.0, 0.75, tile);
  vec3 q = p - vec3(RING, 0.0);
  // During the tile beat the domed C presses back into the growing slab.
  vec3 qs = q + vec3(0.0, 0.0, 1.25 * sink);

  // Seed and shell. The opening starts on the far-left limb and turns to face the viewer,
  // as in the brand film: the shell rotates to reveal what is inside.
  float turn = mix(1.92, 0.0, smoothstep(0.08, 1.0, open));
  vec3 axis = normalize(vec3(-sin(turn), 0.1 * sin(turn), cos(turn)));
  float hole = mix(-0.08, INNER, smoothstep(0.0, 0.5, open));
  float along = dot(qs, axis);
  float bore = max(length(qs - axis * along) - hole, -along);
  float shell = smax(length(qs) - OUTER, -bore, 0.045);
  // The rim parts into the official C; the gap grows from the right.
  float footprint = mix(-0.7, sdC(p.xy), split);
  float navyC = smax(shell, footprint, 0.035 * split + 0.001);
  // Tile: the navy swells into the official rounded square while the core sinks into it
  // and the C rises out of the same surface in relief.
  float depth = mix(0.24, 0.022, uFlat);
  float relief = mix(0.075, 0.008, uFlat);
  float edge = mix(0.16, 0.012, uFlat);
  // Sequence, as in the brand film: the slab grows from behind as a squircle (circle →
  // official rounded square, 0 → .85) while the domed C presses back into it like soft clay
  // and the sand core stays in view; then the core sinks (.4 → .72) as the C rises out of
  // the slab's current face (.4 → .82): the sand moves from the dome into the C.
  float withdraw = smoothstep(0.4, 0.72, tile);
  float core = length(q - vec3(0.0, 0.0, -0.05 - 1.1 * withdraw)) - mix(0.8, -0.05, withdraw);
  float square = smoothstep(0.05, 0.85, tile);
  float foot = mix(length(p.xy - RING) - OUTER, sdRoundRect(p.xy, TILE_HALF, TILE_RADIUS), square)
             + mix(0.6, 0.0, smoothstep(0.0, 0.35, tile));
  float shift = mix(0.45, 0.0, smoothstep(0.0, 0.6, tile));
  float slab = extrude(foot, p.z + shift, depth, edge);
  float navy = tile <= 0.0 ? navyC : smin(navyC, slab, 0.14 * (1.0 - uFlat) + 0.001);
  float rise = mix(-1.2 * relief - 0.03, 0.0, smoothstep(0.4, 0.82, tile));
  float raised = p.z - (depth - shift) - relief - rise;
  // The C surfaces thin and swells to the official stroke, so it never grazes the dome's lip.
  float thin = mix(0.09, 0.0, smoothstep(0.4, 0.75, tile));
  float creamC = tile < 0.3 ? 1e3 : extrude(sdC(p.xy) + thin, raised, relief, min(relief, 0.06) * 0.95);
  float cream = tile <= 0.0 ? core : min(core, creamC);

  // The meeting point: comes forward from behind the core and settles in the gap,
  // then lands on the tile with the C.
  vec3 c = mix(vec3(0.5, -0.12, -0.32), vec3(DOT.xy, 0.38), emerge);
  float sphere = length(p - c) - DOT.z * mix(0.55, 1.0, emerge);
  float disc = extrude(length(p.xy - DOT.xy) - DOT.z, raised, relief, min(relief, 0.06) * 0.95);
  float point = emerge <= 0.0 ? 1e3 : mix(sphere, disc, smoothstep(0.35, 0.9, tile));

  vec2 res = vec2(navy, 0.0);
  if (cream < res.x) res = vec2(cream, 1.0);
  if (point < res.x) res = vec2(point, 2.0);
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
    t += clamp(h, 0.04, 0.35);
    if (res < 0.002 || t > 3.5) break;
  }
  return clamp(res, 0.0, 1.0);
}

float occlusion(vec3 p, vec3 n) {
  float o = 0.0, w = 1.0;
  for (int i = 1; i <= 3; i++) {
    float h = 0.045 * float(i);
    o += (h - map(p + n * h).x) * w;
    w *= 0.6;
  }
  return clamp(1.0 - 2.4 * o, 0.0, 1.0);
}

vec3 toSRGB(vec3 c) {
  c = max(c, 0.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  float unit = 1.0 / uPlace.z;                       // world units per device pixel
  vec2 xy = (gl_FragCoord.xy - uPlace.xy) * unit;
  mat3 toWorld = transpose(uToObject);
  vec3 ro = uToObject * vec3(xy, 4.0);
  vec3 rd = uToObject * vec3(0.0, 0.0, -1.0);

  // Key light upper-left, broad and soft; a frontal light for the cast shadow.
  vec3 key = normalize(vec3(-0.55, 0.72, 0.62));
  vec3 caster = normalize(vec3(-0.22, 0.42, 1.0));

  float alpha = 0.0;
  vec3 colour = vec3(0.0);
  float b = dot(ro, rd);
  float disc = b * b - dot(ro, ro) + BOUND * BOUND;
  if (disc > 0.0) {
    float t = -b - sqrt(disc), tEnd = -b + sqrt(disc);
    float eps = 0.3 * unit, closest = 1e9, tClosest = t;
    bool hit = false;
    for (int i = 0; i < 80; i++) {
      float d = map(ro + rd * t).x;
      if (d < closest) { closest = d; tClosest = t; }
      if (d < eps) { hit = true; break; }
      t += d * 0.94;
      if (t > tEnd) break;
    }
    // Analytic silhouette coverage from the closest approach: one pixel of anti-aliasing.
    // Centred on the true edge (a pixel half outside is half covered), so the silhouette
    // matches the SVG's own rasterisation at the hand-off instead of growing by a pixel.
    alpha = hit ? 1.0 : clamp(0.5 - closest / unit, 0.0, 1.0);
    if (alpha > 0.0) {
      vec3 p = ro + rd * (hit ? t : tClosest);
      vec2 m = map(p);
      vec3 n = normalAt(p, max(0.6 * unit, 0.0015));
      vec3 nw = toWorld * n;
      vec3 v = vec3(0.0, 0.0, 1.0);

      float tile = uShape.w;
      vec3 coreTone = mix(SAND, OFF_WHITE, smoothstep(0.2, 1.0, tile));
      vec3 pointTone = mix(NAVY, OFF_WHITE, smoothstep(0.35, 0.9, tile));
      vec3 albedo = m.y < 0.5 ? NAVY * 1.2 : (m.y < 1.5 ? coreTone : pointTone * mix(1.2, 1.0, smoothstep(0.35, 0.9, tile)));
      vec3 flatTone = m.y < 0.5 ? vec3(0.0941, 0.1961, 0.3333) : vec3(0.9725, 0.9647, 0.9412);

      float shade = softShadow(p + n * 0.01, uToObject * key, 9.0);
      float ao = occlusion(p, n);
      // Sand is lit more softly than navy so its limb never reads as a dark membrane.
      float soft = m.y > 0.5 && m.y < 1.5 ? 0.9 : 0.45;
      float wrap = clamp((dot(nw, key) + soft) / (1.0 + soft), 0.0, 1.0);
      shade = mix(shade, 1.0, soft - 0.45);
      vec3 hemi = mix(vec3(0.62, 0.55, 0.47), vec3(0.93, 0.94, 0.97), 0.5 + 0.5 * nw.y) * (1.0 + (soft - 0.45) * 0.6);
      vec3 h = normalize(key + v);
      float spec = pow(max(dot(nw, h), 0.0), 22.0) * 0.07 * shade;
      float sheen = pow(1.0 - max(dot(nw, v), 0.0), 3.0) * 0.16;
      vec3 lit = albedo * (wrap * shade * vec3(1.0, 0.98, 0.95) * 1.05 + hemi * 0.38) * ao
               + vec3(spec) + sheen * vec3(0.85, 0.87, 0.92) * ao * mix(0.6, 0.25, step(0.5, m.y));
      vec3 srgb = toSRGB(lit);
      // Hand-off: lighting converges to the exact flat colours of logo.svg.
      colour = mix(srgb, flatTone, smoothstep(0.3, 1.0, uFlat));
    }
  }

  // Soft contact shadow on the page plane behind the object; gone once the symbol is flat.
  // The page point is projected along the light onto the object's mid-plane and one distance
  // sample gives a soft footprint: most shaded pixels are background, so this pass must be
  // a single evaluation rather than a marched shadow ray.
  float shadowAlpha = 0.0;
  if (alpha < 1.0 && uFlat < 1.0) {
    vec2 onPlane = xy + caster.xy * (1.05 / caster.z);
    float d = map(uToObject * vec3(onPlane, 0.0)).x;
    shadowAlpha = (1.0 - smoothstep(-0.3, 0.55, d)) * 0.19 * (1.0 - uFlat);
  }
  // At the hand-off the symbol is a flat, frontal figure: resolve it analytically in 2D with
  // per-pixel coverage, the way the browser rasterises logo.svg, so the swap is exact.
  float exact = smoothstep(0.86, 1.0, uFlat);
  if (exact > 0.0) {
    float tileCover = clamp(0.5 - sdRoundRect(xy, TILE_HALF, TILE_RADIUS) / unit, 0.0, 1.0);
    float markCover = clamp(0.5 - min(sdC(xy), length(xy - DOT.xy) - DOT.z) / unit, 0.0, 1.0);
    vec3 flatColour = mix(vec3(0.0941, 0.1961, 0.3333), vec3(0.9725, 0.9647, 0.9412), markCover);
    colour = mix(colour, flatColour, exact);
    alpha = mix(alpha, tileCover, exact);
  }
  vec3 shadowTone = vec3(0.09, 0.14, 0.22);
  float dither = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  float a = alpha + shadowAlpha * (1.0 - alpha);
  outColor = vec4((colour + dither * (1.0 - uFlat)) * alpha + shadowTone * shadowAlpha * (1.0 - alpha), a);
}`;
