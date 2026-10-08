import { SYMBOL, TILE } from './geometry';

const f = (n: number) => n.toFixed(5);
const { ring, dot, field } = SYMBOL;

export const VERTEX = /* glsl */ `#version 300 es
in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;

/*
  One object, built from the official symbol's own measurements:
  · the seed is a hollow sphere whose wall is exactly the C's ring (outer Ø 186.84, inner
    Ø 128.94), around a sand core — the idea;
  · one planar cut sweeps back to the equator, so the opening's face is the C's annulus;
  · the official C is cut out of that face, and the meeting point comes out of the core;
  · the plate extends outward from the C, the core sinks and the sand rises as the C relief;
  · it flattens into the exact figure of logo.svg for the hand-off.
  Navy is structure (shell, plate); sand is the idea (core, point, C). No clay blends: unions
  are plain, edges carry fillets about a pixel wide so they stay crisp without aliasing.
*/
export const FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec3 uPlace;      // object centre on screen (device px, bottom-left) · device px per unit
uniform vec4 uShape;      // cut, split, point, plate
uniform float uFlat;
uniform mat3 uCamera;     // world-space camera basis: right, up, back
uniform vec4 uLens;       // focus distance · orthographic blend · floor height · floor visibility
uniform float uBound;     // radius enclosing the object at its current stage
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

// Brand colours, linear (sRGB #183255 navy, #E8D8C5 sand, #F8F6F0 off-white).
const vec3 NAVY = vec3(0.00913, 0.03190, 0.09084);
const vec3 SAND = vec3(0.80695, 0.68669, 0.55830);
const vec3 OFF_WHITE = vec3(0.93869, 0.92158, 0.87137);
const vec3 NAVY_SRGB = vec3(0.0941, 0.1961, 0.3333);
const vec3 OFF_WHITE_SRGB = vec3(0.9725, 0.9647, 0.9412);

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

// Stage values that depend only on uniforms, computed once per pixel.
vec3 gDot;
float gCut, gFlatten, gK, gDepth, gRelief, gEdge, gWithdraw, gSquare, gRise, gThin, gDotR, gDisc;

void prepare(float pixel) {
  float cut = uShape.x, emerge = uShape.z, plate = uShape.w;
  gK = max(0.005, 1.2 * pixel);                         // fillets about a pixel wide
  gCut = mix(OUTER + 0.03, 0.0, cut);                    // cut plane sweeps to the equator
  gFlatten = mix(1.0, 0.12, smoothstep(0.0, 0.7, plate)); // the shell's body folds into the plate
  gDepth = mix(0.07, 0.018, uFlat);                      // plate half-thickness
  gRelief = mix(0.034, 0.007, uFlat);
  gEdge = mix(0.022, 0.01, uFlat);
  gWithdraw = smoothstep(0.36, 0.66, plate);
  gSquare = mix(0.44, 1.0, smoothstep(0.08, 0.7, plate));  // starts fully hidden behind the C
  gRise = mix(-1.6 * gRelief - 0.04, 0.0, smoothstep(0.3, 0.66, plate));
  gThin = mix(0.08, 0.0, smoothstep(0.34, 0.7, plate));
  gDot = mix(vec3(0.3, -0.08, -0.05), vec3(DOT.xy, 0.0), emerge);
  gDotR = DOT.z * mix(0.6, 1.0, emerge);
  gDisc = smoothstep(0.35, 0.9, plate);
}

// x: distance · y: material (0 navy, 1 sand).
vec2 map(vec3 p) {
  float split = uShape.y, emerge = uShape.z, plate = uShape.w;
  vec3 q = p - vec3(RING, 0.0);

  // Hollow seed, cut by a plane; the face left behind is the C's ring.
  vec3 qf = vec3(q.xy, q.z / gFlatten);
  float r = length(qf);
  float shell = max(r - OUTER, INNER - r);
  shell = smax(shell, -(length(vec2(r - OUTER, qf.z)) - 0.0065), 0.003); // parting line: where it will open
  shell = smax(shell, qf.z - gCut / gFlatten, gK);
  if (split > 0.0) shell = smax(shell, mix(-0.7, sdC(p.xy), split), gK);
  float navy = shell * gFlatten;

  float sand = length(q - vec3(0.0, 0.0, -0.24 - 0.7 * gWithdraw)) - mix(0.6, -0.05, gWithdraw);
  float raised = 0.0;
  if (plate > 0.0) {
    // The plate is the official rounded square from the start, scaled up from behind the C.
    float foot = sdRoundRect(p.xy / gSquare, TILE_HALF, TILE_RADIUS) * gSquare;
    navy = min(navy, extrude(foot, p.z + gDepth, gDepth, gEdge));
    raised = p.z - gRelief - gRise;
    if (plate >= 0.3) sand = min(sand, extrude(sdC(p.xy) + gThin, raised, gRelief, gRelief * 0.35));
  }
  if (emerge > 0.0) {
    // The meeting point leaves the core through the gap, then settles on the plate.
    float point = length(p - gDot) - gDotR;
    if (plate > 0.0) point = mix(point, extrude(length(p.xy - DOT.xy) - DOT.z, raised, gRelief, gRelief * 0.35), gDisc);
    sand = min(sand, point);
  }
  return navy < sand ? vec2(navy, 0.0) : vec2(sand, 1.0);
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
  for (int i = 1; i <= 2; i++) { float h = 0.06 * float(i); o += (h - map(p + n * h).x) * w; w *= 0.6; }
  return clamp(1.0 - 2.4 * o, 0.0, 1.0);
}

// Studio in camera space (x right, y up, z towards the viewer): a large key softbox with a
// soft falloff, two rim strips that draw the silhouette and a warm floor bounce.
float softbox(vec3 d, vec3 c, vec2 size, float soft) {
  float k = dot(d, c);
  if (k <= 0.0) return 0.0;
  vec3 u = normalize(cross(vec3(0.0, 1.0, 0.0001), c)), v = cross(c, u);
  vec2 g = abs(vec2(dot(d, u), dot(d, v)) / k);
  vec2 e = 1.0 - smoothstep(size - soft, size + soft, g);
  return e.x * e.y * (1.0 - 0.45 * dot(g / size, g / size) * 0.5);
}
const vec3 KEY = vec3(-0.55, 0.6, 0.6);
vec3 environment(vec3 d, float rough) {
  float soft = mix(0.08, 0.6, rough);
  vec3 col = mix(vec3(0.6, 0.53, 0.45) * 0.3, vec3(0.93, 0.94, 0.96) * 0.36, smoothstep(-0.5, 0.7, d.y));
  col += vec3(1.0, 0.98, 0.95) * 2.2 * softbox(d, normalize(KEY), vec2(0.8, 0.5), soft);
  col += vec3(0.9, 0.94, 1.0) * 1.1 * softbox(d, normalize(vec3(0.95, 0.1, -0.3)), vec2(0.16, 1.0), soft + 0.1);
  col += vec3(0.95, 0.95, 1.0) * 0.45 * softbox(d, normalize(vec3(-0.95, 0.05, -0.3)), vec2(0.14, 0.9), soft + 0.1);
  return col;
}

vec3 toSRGB(vec3 c) {
  c = max(c, 0.0);
  c = mix(c, 0.82 + 0.18 * (1.0 - exp(-(c - 0.82) / 0.18)), step(0.82, c)); // soft shoulder
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float hash2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  float unit = 1.0 / uPlace.z;                       // world units per device pixel at the focus plane
  prepare(unit);
  vec2 uv = (gl_FragCoord.xy - uPlace.xy) * unit;
  vec3 right = uCamera[0], up = uCamera[1], back = uCamera[2];
  float dist = uLens.x, ortho = uLens.y;
  vec3 lateral = right * uv.x + up * uv.y;
  vec3 ro = back * dist + lateral * ortho;
  vec3 rd = normalize(-back * dist + lateral * (1.0 - ortho));
  mat3 toCamera = transpose(uCamera);
  vec3 keyW = uCamera * normalize(KEY);

  float alpha = 0.0, tHit = 1e9;
  vec3 colour = vec3(0.0);
  float b = dot(ro, rd);
  float disc = b * b - dot(ro, ro) + uBound * uBound;
  if (disc > 0.0) {
    float t = max(-b - sqrt(disc), 0.0), tEnd = -b + sqrt(disc);
    float closest = 1e9, tClosest = t;
    bool hit = false;
    for (int i = 0; i < 72; i++) {
      float pixel = unit * mix(t / dist, 1.0, ortho);
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
      vec3 nc = toCamera * n, vc = toCamera * -rd;
      float plate = uShape.w;
      bool sand = m.y > 0.5;
      // The cut face reads as a different, machined finish of the same navy.
      bool section = !sand && plate < 0.5 && abs(p.z - gCut) < 2.0 * pixel + 0.002 && n.z > 0.9;
      vec3 albedo = sand ? mix(SAND, OFF_WHITE, smoothstep(0.2, 1.0, plate)) : NAVY * 1.3;
      float rough = sand ? 0.5 : (section ? 0.72 : 0.4);

      float shade = dot(n, keyW) < -0.25 ? 0.0 : softShadow(p + n * 0.01, keyW, sand ? 6.0 : 10.0);
      float ao = occlusion(p, n);
      float soft = sand ? 0.7 : 0.3;
      float wrap = clamp((dot(n, keyW) + soft) / (1.0 + soft), 0.0, 1.0);
      shade = mix(shade, 1.0, sand ? 0.35 : 0.0);
      vec3 hemi = mix(vec3(0.66, 0.58, 0.49), vec3(0.93, 0.94, 0.97), 0.5 + 0.5 * nc.y);
      vec3 diffuse = albedo * (wrap * shade * vec3(1.0, 0.98, 0.95) * 1.0 + hemi * 0.34) * ao;
      float fresnel = 0.04 + 0.96 * pow(1.0 - max(dot(nc, vc), 0.0), 5.0);
      // Navy carries a thin clear layer: one lookup at a slightly sharper roughness gives soft,
      // defined highlights without a second environment evaluation.
      float gloss = sand || section ? rough : rough * 0.7;
      vec3 reflection = environment(reflect(-vc, nc), gloss) * fresnel * mix(1.0, 0.5, gloss);
      reflection *= mix(0.5, 1.0, shade) * ao;
      colour = mix(toSRGB(diffuse + reflection), sand ? OFF_WHITE_SRGB : NAVY_SRGB, smoothstep(0.3, 1.0, uFlat));
    }
  }

  // Contact shadow on the floor.
  float shadowAlpha = 0.0;
  if (uLens.w > 0.0 && abs(rd.y) > 1e-4) {
    float tf = (uLens.z - ro.y) / rd.y;
    if (tf > 0.0 && tf < tHit) {
      vec3 pf = ro + rd * tf;
      if (length(pf.xz) < 1.6 && uShape.w < 0.9) {
        // One sample above the floor, towards the light: soft shadow and contact in one.
        float occ = clamp((map(pf + normalize(vec3(-0.2, 1.0, 0.35)) * 0.3).x + 0.06) / 0.5, 0.0, 1.0);
        shadowAlpha = (1.0 - occ) * 0.3 * uLens.w * (1.0 - uShape.w);
      }
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
  float a = alpha + shadowAlpha * (1.0 - alpha);
  outColor = vec4((colour + dither * (1.0 - uFlat)) * alpha + vec3(0.09, 0.14, 0.22) * shadowAlpha * (1.0 - alpha), a);
}`;
