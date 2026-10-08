import type { Camera } from './camera';
import { SYMBOL } from './geometry';

/*
  The story's single clock. Story time s (0 → 1) maps to the object's shape, the camera, the
  floor, the placement on screen and every DOM layer around it. The renderer and the DOM read
  the same values in the same frame, so they cannot drift apart.

  Manual p.8: seed → opening → meeting point → the hub, following the brand film
  (Referências/ConnectionsHUb.mp4). Each beat is its own shot: the camera, framing and
  atmosphere change with the narrative instead of holding one composition.
*/
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** Smooth in/out for shape changes. */
export const smooth = (t: number) => t * t * (3 - 2 * t);
/** Expo-like settle for arrivals; matches --ease-out in tokens.css. */
export const settle = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)) / (1 - Math.pow(2, -10));

/** Share of the pinned scroll the story uses; the rest is the next sheet sliding over it. */
export const STORY_END = 0.88;

export const BEATS = {
  heroOut: [0.025, 0.12],
  travel: [0.02, 0.16],
  open: [0.27, 0.46],
  split: [0.46, 0.6],
  dot: [0.52, 0.645],
  tile: [0.645, 0.79],
  land: [0.785, 0.885],
  flat: [0.8, 0.885],
  handoff: 0.888,
  name: [0.895, 0.95],
  final: [0.95, 0.99],
} as const;

/** Visibility windows for the four concept chapters: [in, out]. */
export const CHAPTERS = [
  [0.13, 0.28],
  [0.3, 0.47],
  [0.485, 0.655],
  [0.665, 0.8],
] as const;

export type Shape = { open: number; split: number; dot: number; tile: number; flat: number };
export type Placement = { x: number; y: number; scale: number };

export function shapeAt(s: number): Shape {
  return {
    open: smooth(range(s, ...BEATS.open)),
    split: smooth(range(s, ...BEATS.split)),
    dot: smooth(range(s, ...BEATS.dot)),
    tile: smooth(range(s, ...BEATS.tile)),
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

// Shots: [s, yaw, pitch]. The camera reveals depth where the form changes in depth (the shell
// turning open, the slab) and squares up where the form is read as a figure (the C, the logo).
const SHOTS = [
  [0, 0.2, 0.2],
  [0.14, 0.04, 0.15],
  [0.3, -0.5, 0.3],
  [0.46, -0.1, 0.12],
  [0.56, 0.2, 0.07],
  [0.645, 0.02, 0.06],
  [0.73, 0.44, 0.24],
  [0.8, 0.16, 0.08],
  [0.885, 0, 0],
] as const;

export function cameraAt(s: number, narrow: boolean, tilt = { x: 0, y: 0 }): Camera {
  const [yaw, pitch] = track(SHOTS, s);
  const flat = smooth(range(s, BEATS.flat[0] - 0.02, BEATS.flat[1]));
  const free = 1 - flat;
  return {
    yaw: (yaw * (narrow ? 0.6 : 1) + tilt.x * 0.16) * free,
    pitch: (pitch + tilt.y * 0.08) * free,
    distance: 6.5,
    ortho: flat,
  };
}

/** The drafting floor: rests under the object, then folds up into the page for the hand-off. */
export function floorAt(s: number) {
  const tile = smooth(range(s, BEATS.tile[0], BEATS.tile[1] - 0.04));
  return {
    fold: smooth(range(s, BEATS.land[0], BEATS.flat[1])),
    height: -mix(SYMBOL.ring.outer, SYMBOL.tileHalf, tile) - 0.004,
    visibility: 1 - smooth(range(s, BEATS.flat[1] - 0.01, BEATS.handoff + 0.01)),
  };
}

/** Subtle shifts in the paper's tone per stage: warm as the sand is revealed, cool for the C. */
export function atmosphereAt(s: number) {
  const warm = smooth(range(s, 0.27, 0.38)) * (1 - smooth(range(s, 0.46, 0.55)));
  const cool = smooth(range(s, 0.48, 0.58)) * (1 - smooth(range(s, 0.66, 0.76)));
  return { warm, cool };
}

export type Layout = { width: number; height: number; narrow: boolean; heroSlot?: { top: number; bottom: number } };
export const layoutFor = (width: number, height: number, heroSlot?: Layout['heroSlot']): Layout => ({ width, height, narrow: width / height < 1.05 || width < 760, heroSlot });

// Framing per shot: [s, x (share of width), y (share of height), scale (share of min(h, .62w))].
// The object travels across the frame so each chapter has its own composition.
const FRAMES_WIDE = [
  [0, 0.75, 0.58, 0.25],
  [0.14, 0.66, 0.52, 0.27],
  [0.3, 0.36, 0.53, 0.27],
  [0.46, 0.38, 0.52, 0.28],
  [0.56, 0.41, 0.5, 0.32],
  [0.645, 0.44, 0.52, 0.29],
  [0.72, 0.68, 0.52, 0.205],
  [0.785, 0.66, 0.52, 0.2],
] as const;

export function placementAt(s: number, { width: w, height: h, narrow, heroSlot }: Layout, landing?: Placement): Placement {
  const land = smooth(range(s, ...BEATS.land));
  let frame: Placement;
  if (narrow) {
    // Narrow: the seed sits centred in whatever space the copy leaves, never over the headline.
    const slot = heroSlot ?? { top: h * 0.08, bottom: h * 0.42 };
    const heroScale = Math.max(28, Math.min(w * 0.21, (slot.bottom - slot.top) * 0.36));
    const stageScale = Math.min(w * 0.23, h * 0.13);
    const travel = settle(range(s, ...BEATS.travel));
    const tile = smooth(range(s, ...BEATS.tile));
    frame = {
      x: w / 2,
      y: mix((slot.top + slot.bottom) / 2, h * 0.36, travel),
      scale: mix(heroScale, stageScale, travel) * mix(1, 0.78, tile),
    };
  } else {
    const [x, y, k] = track(FRAMES_WIDE, s);
    frame = { x: x * w, y: y * h, scale: k * Math.min(h, 0.62 * w) };
  }
  const target = landing ?? frame;
  return { x: mix(frame.x, target.x, land), y: mix(frame.y, target.y, land), scale: mix(frame.scale, target.scale, land) };
}

/** 0 → 1 → 0 visibility of a chapter, with a separate draw-on value for its annotations. */
export function chapterAt(s: number, index: number) {
  const [a, b] = CHAPTERS[index];
  const enter = settle(range(s, a, a + 0.035));
  const leave = smooth(range(s, b - 0.03, b));
  return { visible: enter * (1 - leave), enter, leave, draw: smooth(range(s, a + 0.02, a + 0.075)) * (1 - leave) };
}

export function finaleAt(s: number) {
  return {
    handed: s >= BEATS.handoff,
    name: smooth(range(s, ...BEATS.name)),
    construction: smooth(range(s, BEATS.name[0], BEATS.name[0] + 0.03)) * (1 - smooth(range(s, BEATS.final[0], BEATS.final[1]))),
    final: settle(range(s, ...BEATS.final)),
    frame: 1 - smooth(range(s, BEATS.tile[1] - 0.02, BEATS.land[1])),
  };
}
