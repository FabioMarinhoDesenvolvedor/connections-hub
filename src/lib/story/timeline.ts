/*
  The story's single clock. Scroll progress p (0 → 1 across the pinned section) maps to
  the object's shape, pose and placement, and to every DOM layer around it. The renderer
  and the DOM read the same values in the same frame, so they cannot drift apart.

  Manual p.8: seed → opening → meeting point → the hub. The beats below follow the brand
  film (Referências/ConnectionsHUb.mp4).
*/
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** Smooth in/out for shape changes. */
export const smooth = (t: number) => t * t * (3 - 2 * t);
/** Expo-like settle for arrivals; matches --ease-out in tokens.css. */
export const settle = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)) / (1 - Math.pow(2, -10));
const bump = (t: number) => Math.sin(Math.PI * clamp(t));

export const BEATS = {
  heroOut: [0.03, 0.13],
  travel: [0.03, 0.19],
  open: [0.27, 0.46],
  split: [0.46, 0.6],
  dot: [0.52, 0.645],
  tile: [0.645, 0.79],
  land: [0.785, 0.885],
  flat: [0.8, 0.885],
  handoff: 0.888,
  name: [0.895, 0.95],
  final: [0.925, 0.975],
} as const;

/** Visibility windows for the four concept chapters: [in, out]. */
export const CHAPTERS = [
  [0.135, 0.285],
  [0.3, 0.47],
  [0.485, 0.655],
  [0.665, 0.8],
] as const;

export type Shape = { open: number; split: number; dot: number; tile: number; flat: number };
export type Pose = { pitch: number; yaw: number };
export type Placement = { x: number; y: number; scale: number };

export function shapeAt(p: number): Shape {
  return {
    open: smooth(range(p, ...BEATS.open)),
    split: smooth(range(p, ...BEATS.split)),
    dot: smooth(range(p, ...BEATS.dot)),
    tile: smooth(range(p, ...BEATS.tile)),
    flat: smooth(range(p, ...BEATS.flat)),
  };
}

/** Choreographed rotation: frontal at rest, turning only to show depth between states. */
export function poseAt(p: number): Pose {
  const split = range(p, BEATS.split[0] - 0.02, BEATS.dot[1]);
  const tile = range(p, BEATS.tile[0], BEATS.flat[1]);
  const flat = smooth(range(p, ...BEATS.flat));
  return {
    pitch: (0.1 * bump(split) + 0.3 * bump(tile)) * (1 - flat),
    yaw: (-0.42 * bump(split) - 0.4 * bump(tile)) * (1 - flat),
  };
}

/** heroSlot: on narrow screens, the free band above the hero copy (top/bottom in px). */
export type Layout = { width: number; height: number; narrow: boolean; heroSlot?: { top: number; bottom: number } };
export const layoutFor = (width: number, height: number, heroSlot?: Layout['heroSlot']): Layout => ({ width, height, narrow: width / height < 1.05 || width < 760, heroSlot });

export function placementAt(p: number, { width: w, height: h, narrow, heroSlot }: Layout, landing?: Placement): Placement {
  // Narrow: the seed sits centred in whatever space the copy leaves, never over the headline.
  const slot = heroSlot ?? { top: h * 0.08, bottom: h * 0.42 };
  const hero: Placement = narrow
    ? { x: w / 2, y: (slot.top + slot.bottom) / 2, scale: Math.max(24, Math.min(w * 0.2, (slot.bottom - slot.top) * 0.36)) }
    : { x: w * 0.73, y: h * 0.53, scale: Math.min(h * 0.215, w * 0.135) };
  const stage: Placement = narrow
    ? { x: w / 2, y: h * 0.36, scale: Math.min(w * 0.215, h * 0.12) }
    : { x: w * 0.64, y: h * 0.5, scale: Math.min(h * 0.235, w * 0.15) };
  const travel = settle(range(p, ...BEATS.travel));
  const land = smooth(range(p, ...BEATS.land));
  const target = landing ?? stage;
  // The tile is larger than the sphere; ease its growth so the silhouette stays in frame.
  const grow = mix(1, 0.86, smooth(range(p, ...BEATS.tile)));
  const x = mix(mix(hero.x, stage.x, travel), target.x, land);
  const y = mix(mix(hero.y, stage.y, travel), target.y, land);
  const scale = mix(mix(hero.scale, stage.scale, travel) * grow, target.scale, land);
  return { x, y, scale };
}

/** 0 → 1 → 0 visibility of a chapter, with a separate draw-on value for its leader line. */
export function chapterAt(p: number, index: number) {
  const [a, b] = CHAPTERS[index];
  const fadeIn = settle(range(p, a, a + 0.03));
  const fadeOut = smooth(range(p, b - 0.03, b));
  return { visible: fadeIn * (1 - fadeOut), enter: fadeIn, leave: fadeOut, draw: smooth(range(p, a + 0.015, a + 0.06)) * (1 - fadeOut) };
}

export function finaleAt(p: number) {
  return {
    handed: p >= BEATS.handoff,
    name: smooth(range(p, ...BEATS.name)),
    final: settle(range(p, ...BEATS.final)),
    frame: 1 - smooth(range(p, BEATS.tile[1] - 0.02, BEATS.land[1])),
  };
}
