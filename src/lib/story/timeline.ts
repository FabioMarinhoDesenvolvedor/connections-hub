import type { Camera } from './camera';
import { SYMBOL } from './geometry';

/*
  The story's single clock. Story time s (0 → 1) maps to the object's shape, the camera, the
  placement and the copy. Renderer and DOM read the same values in the same frame.

  Manual p.8, in three beats: the seed opens · it needs a meeting point · the hub.
*/
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
/** Expo-like settle for arrivals; matches --ease-out in tokens.css. */
export const settle = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)) / (1 - Math.pow(2, -10));

/** Share of the pinned scroll the story uses; the rest is the next sheet sliding over it. */
export const STORY_END = 0.82;

export const BEATS = {
  heroOut: [0.03, 0.12],
  cut: [0.16, 0.38],
  split: [0.42, 0.55],
  dot: [0.47, 0.6],
  plate: [0.62, 0.78],
  land: [0.77, 0.87],
  flat: [0.79, 0.87],
  handoff: 0.875,
  name: [0.88, 0.94],
  final: [0.93, 0.98],
} as const;

/** Copy: [in, out] per sentence. The first two share one block: the seed, then its opening. */
export const LINES = [
  [0.12, 0.42],
  [0.27, 0.42],
  [0.45, 0.61],
  [0.64, 0.78],
] as const;

export type Shape = { cut: number; split: number; dot: number; plate: number; flat: number };
export type Placement = { x: number; y: number; scale: number };

export function shapeAt(s: number): Shape {
  return {
    cut: smooth(range(s, ...BEATS.cut)),
    split: smooth(range(s, ...BEATS.split)),
    dot: smooth(range(s, ...BEATS.dot)),
    plate: smooth(range(s, ...BEATS.plate)),
    flat: smooth(range(s, ...BEATS.flat)),
  };
}

/** Piecewise keyframes with eased segments: [s, ...values]. */
function track(keys: readonly (readonly number[])[], s: number) {
  if (s <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) {
    if (s <= keys[i][0]) {
      const t = smooth(range(s, keys[i - 1][0], keys[i][0]));
      return keys[i].slice(1).map((v, k) => mix(keys[i - 1][k + 1], v, t));
    }
  }
  return keys[keys.length - 1].slice(1);
}

// Camera [s, yaw, pitch]: three-quarter views where depth matters (the cut, the plate),
// frontal where the figure must be read (the C, the logo).
const SHOTS = [
  [0, 0.32, 0.2],
  [0.16, 0.5, 0.26],
  [0.38, 0.3, 0.22],
  [0.48, 0.04, 0.06],
  [0.6, 0.02, 0.05],
  [0.7, -0.38, 0.16],
  [0.79, -0.2, 0.08],
  [0.87, 0, 0],
] as const;

export function cameraAt(s: number, narrow: boolean, tilt = { x: 0, y: 0 }): Camera {
  const [yaw, pitch] = track(SHOTS, s);
  const flat = smooth(range(s, BEATS.flat[0] - 0.02, BEATS.flat[1]));
  const free = 1 - flat;
  return {
    yaw: (yaw * (narrow ? 0.7 : 1) + tilt.x * 0.12) * free,
    pitch: (pitch + tilt.y * 0.06) * free,
    distance: 6.5,
    ortho: flat,
  };
}

/** The floor only carries the contact shadow; it settles with the object and fades at the end. */
export function floorAt(s: number) {
  const plate = smooth(range(s, BEATS.plate[0], BEATS.plate[1] - 0.04));
  return {
    height: -mix(SYMBOL.ring.outer, SYMBOL.tileHalf, plate) - 0.004,
    visibility: 1 - smooth(range(s, BEATS.land[0], BEATS.flat[1])),
  };
}

export type Layout = { width: number; height: number; narrow: boolean; heroSlot?: { top: number; bottom: number } };
export const layoutFor = (width: number, height: number, heroSlot?: Layout['heroSlot']): Layout => ({ width, height, narrow: width / height < 1.05 || width < 760, heroSlot });

// Framing [s, x, y (shares of the viewport), scale (share of min(h, .62w))]. The copy keeps
// one place on the left; the object stays on the right and only breathes.
const FRAMES_WIDE = [
  [0, 0.76, 0.56, 0.23],
  [0.14, 0.66, 0.52, 0.27],
  [0.4, 0.65, 0.52, 0.28],
  [0.5, 0.64, 0.51, 0.3],
  [0.62, 0.65, 0.52, 0.27],
  [0.72, 0.66, 0.52, 0.2],
] as const;

export function placementAt(s: number, { width: w, height: h, narrow, heroSlot }: Layout, landing?: Placement): Placement {
  const land = smooth(range(s, ...BEATS.land));
  let frame: Placement;
  if (narrow) {
    // Narrow: the seed sits centred in the space the copy leaves, never over the headline.
    const slot = heroSlot ?? { top: h * 0.08, bottom: h * 0.42 };
    const heroScale = Math.max(28, Math.min(w * 0.21, (slot.bottom - slot.top) * 0.36));
    const stageScale = Math.min(w * 0.23, h * 0.13);
    const travel = settle(range(s, BEATS.heroOut[0], BEATS.cut[0]));
    const plate = smooth(range(s, ...BEATS.plate));
    frame = { x: w / 2, y: mix((slot.top + slot.bottom) / 2, h * 0.36, travel), scale: mix(heroScale, stageScale, travel) * mix(1, 0.78, plate) };
  } else {
    const [x, y, k] = track(FRAMES_WIDE, s);
    frame = { x: x * w, y: y * h, scale: k * Math.min(h, 0.62 * w) };
  }
  const target = landing ?? frame;
  return { x: mix(frame.x, target.x, land), y: mix(frame.y, target.y, land), scale: mix(frame.scale, target.scale, land) };
}

/** Visibility of a sentence: wipes in, then the whole block leaves together. */
export function lineAt(s: number, index: number) {
  const [a, b] = LINES[index];
  const enter = settle(range(s, a, a + 0.04));
  const leave = smooth(range(s, b - 0.03, b));
  return { enter, leave, visible: enter * (1 - leave) };
}

export function finaleAt(s: number) {
  return {
    handed: s >= BEATS.handoff,
    name: smooth(range(s, ...BEATS.name)),
    final: settle(range(s, ...BEATS.final)),
  };
}
