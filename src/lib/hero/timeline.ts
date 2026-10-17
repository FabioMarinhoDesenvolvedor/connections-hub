/*
  The opening's clock. Progress p runs through the beats below; the renderer and the flat
  fallback read the same values in the same frame, so they cannot drift apart.

  The intro plays p from INTRO.from to INTRO.to on its own, over INTRO.duration ms, and stops
  on the finished symbol (before the beats that would flatten it).
*/
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** Smooth in/out for shape changes. */
export const smooth = (t: number) => t * t * (3 - 2 * t);
/** Cubic in-out for mechanical moves: dials, card turns, the tile opening. */
export const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const BEATS = {
  release: [0.25, 0.43],   // arcs leave the seed
  spin: [0.2, 0.58],       // dials turn, decelerating
  lock: [0.45, 0.58],      // dials close onto the C
  meet: [0.49, 0.61],      // seed travels to the gap
  seedTurn: [0.52, 0.61],
  turn: [0.565, 0.62],     // first segment's turn; the others follow at 0.02 intervals
  hub: [0.645, 0.78],      // tile opens out, layers settle
  fuse: 0.785,             // the four segments are replaced by the official C
  flat: [0.8, 0.885],      // not reached by the intro: the symbol stays in 3D
} as const;

export const INTRO = {
  from: 0.2,       // the seed, at rest
  to: 0.79,        // the finished symbol, official C fused, still in 3D
  hold: 450,       // ms the seed rests before it opens
  duration: 4300,  // ms from seed to symbol
} as const;

/** Progress at `elapsed` ms since the intro started. */
export function introAt(elapsed: number) {
  const t = clamp((elapsed - INTRO.hold) / INTRO.duration);
  return { p: mix(INTRO.from, INTRO.to, t), done: t >= 1 };
}

/** Centre of the tile in px, and its scale in px per world unit. */
export type Placement = { x: number; y: number; scale: number };
