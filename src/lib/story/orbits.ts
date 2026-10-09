import { BEATS, clamp, ease, mix, range, smooth } from './timeline';

/*
  "Orbits": the brand concept told in thin cut card, layered a few millimetres apart.
    seed      a navy point;
    opening   it releases concentric arcs (the manual's ring vocabulary) that turn like dials;
    meeting   the dials slow, close onto one radius and lock into the four segments of the
              official C; the seed travels out to the C's gap and becomes the dot;
    hub       each card turns over to its light back, the navy tile opens out from beneath
              the meeting point, and the layers settle onto it;
    finale    everything lies flat on the official logo file.
  Pure state: the renderer reads it, and the static fallback draws the same states.

  Units: symbol units, tile half-size = 1, y up, origin at the tile centre. Measured from
  public/brand/symbol-navy.svg (632.23 square); the C fit uses 4000 samples of its path.
*/
const U = 316.115;
export const MARK = {
  corner: 162.68 / U,
  centre: { x: (313 - U) / U, y: 0 },
  mid: (208.78 + 145.05) / 2 / U,
  band: (208.78 - 145.05) / U,
  gap: { from: -44.52, to: 43.14 }, // degrees with no C geometry, around the centre
  dot: { x: (495.88 - U) / U, y: -(364.18 - U) / U, r: 32.47 / U },
} as const;
/** The C artwork itself, in symbol-navy.svg coordinates (632.23 square). */
export const C_PATH = 'M395.51,434.35c-29.54,20.64-67.18,30.5-107.2,23.84-59.7-9.92-106.8-56.62-117.15-116.25-15.79-90.99,53.83-169.96,141.89-169.96,31.88,0,61.35,10.35,85.22,27.88,12.89,9.47,30.73,8.21,42.04-3.1l.36-.36c13.95-13.95,12.25-37.06-3.63-48.76-31.08-22.91-68.73-37.43-109.6-40.21-126.89-8.62-232.4,97.56-222.98,224.39,8.03,108.18,98.35,193.46,208.59,193.46,44.46,0,85.67-13.87,119.56-37.52,18.33-12.79,18.64-39.81.58-52.98h0c-11.18-8.15-26.33-8.37-37.68-.45Z';
export const C_UNIT = U;

export const CARD = 0.035;  // card thickness
const LAYER = 0.05;          // spacing between card layers while they are apart
const C_FROM = MARK.gap.to, C_TO = MARK.gap.from + 360;
const CAP = (MARK.band / 2) / MARK.mid * 180 / Math.PI; // a round end's angular reach

export type ArcColour = 'orange' | 'navy' | 'sand' | 'paper';
// Each arc: its own orbit while open, then one quarter of the C.
export const ARCS: { r: number; half: number; sweep: number; phase: number; speed: number; colour: ArcColour; lift: number }[] = [
  { r: 0.30, half: 0.030, sweep: 150, phase: 40, speed: 160, colour: 'orange', lift: 4 },
  { r: 0.48, half: 0.045, sweep: 210, phase: 200, speed: -110, colour: 'navy', lift: 3 },
  { r: 0.68, half: 0.035, sweep: 120, phase: 300, speed: 80, colour: 'sand', lift: 2 },
  { r: 0.86, half: 0.028, sweep: 250, phase: 120, speed: -55, colour: 'paper', lift: 1 },
];

export type ArcState = { from: number; to: number; radius: number; half: number; z: number; turn: number; visible: boolean };
export type OrbitState = {
  arcs: ArcState[];
  seed: { r: number; x: number; y: number; z: number; turn: number };
  tile: { half: number; corner: number; x: number; y: number; visible: boolean };
  fused: boolean;
  flat: number;
  pitch: number;
  yaw: number;
};

/*
  Hands-on play in the hero (driven by story-stage.tsx): the reader can open the seed early.
    open    arcs leave the seed, as in the release beat;
    spin    degrees added to every dial, each at its own ratio and direction;
    bloom   the dials lock into the C and the seed reaches the gap: the whole idea, briefly;
    lift    the seed rises off the page towards the pointer (its shadow answers);
    press   a small give under the finger;
    lean    extra turn towards the pointer, in units of the tilt.
  All zero at rest, so the scroll story is unchanged.
*/
export type Play = { open: number; spin: number; bloom: number; lift: number; press: number; lean: { x: number; y: number } };
export const REST: Play = { open: 0, spin: 0, bloom: 0, lift: 0, press: 0, lean: { x: 0, y: 0 } };

export function orbitAt(p: number, tilt = { x: 0, y: 0 }, play: Play = REST): OrbitState {
  const storyRelease = ease(range(p, ...BEATS.release));
  const release = Math.max(storyRelease, play.open, play.bloom);
  const lock = Math.max(ease(range(p, ...BEATS.lock)), play.bloom);
  const travel = Math.max(ease(range(p, ...BEATS.meet)), play.bloom);
  const hub = ease(range(p, ...BEATS.hub));
  const flat = ease(range(p, ...BEATS.flat));
  const spin = range(p, ...BEATS.spin);
  const slow = 1 - (1 - spin) * (1 - spin); // dials decelerate into place
  const fused = p >= BEATS.fuse;

  const span = (C_TO - C_FROM - 2 * CAP) / 4;
  const arcs = ARCS.map((a, i): ArcState => {
    const lockedFrom = C_FROM + CAP + span * i, lockedTo = lockedFrom + span;
    const mid = a.phase + a.speed * slow + a.speed / 100 * play.spin;
    // Played open, the arcs leave one after another from the inside out, and reach their
    // orbit early so a half-open seed still reads as rings. At rest this is the story's own.
    const played = clamp(play.open * 1.35 - i * 0.12);
    const own = Math.max(storyRelease, played, play.bloom);
    const from = mix(mid - a.sweep * own / 2, lockedFrom, lock);
    const to = mix(mid + a.sweep * own / 2, lockedTo, lock);
    const half = mix(a.half, MARK.band / 2, lock) * smooth(range(own, 0, 0.25));
    return {
      from, to, half,
      radius: mix(mix(0.12, a.r, Math.max(storyRelease, Math.sqrt(played), play.bloom)), MARK.mid, lock),
      z: mix(a.lift * LAYER, CARD / 2, hub),
      // locked segments turn over one after another, about their own centre line
      turn: ease(range(p, BEATS.turn[0] + i * 0.02, BEATS.turn[1] + i * 0.02)),
      visible: half > 0.003 && !fused,
    };
  });

  const tHalf = mix(MARK.dot.r * 0.9, 1, hub);
  return {
    arcs,
    seed: {
      r: mix(0.34, MARK.dot.r, release) * (1 - 0.06 * play.press),
      x: mix(MARK.centre.x, MARK.dot.x, travel),
      y: mix(MARK.centre.y, MARK.dot.y, travel),
      z: mix(3 * LAYER + 2 * LAYER * release, CARD / 2, hub) + play.lift * 0.16,
      turn: ease(range(p, ...BEATS.seedTurn)), // navy seed, light meeting point
    },
    // the hub opens out from beneath the meeting point and squares into the official tile
    tile: {
      half: tHalf,
      corner: Math.min(tHalf, mix(MARK.dot.r, MARK.corner, hub)),
      x: mix(MARK.dot.x, 0, hub),
      y: mix(MARK.dot.y, 0, hub),
      visible: hub > 0.001,
    },
    fused,
    flat,
    // a fixed, slightly raised viewpoint so the layering reads; frontal for the hand-off
    pitch: (0.2 + clamp(tilt.y, -1, 1) * 0.04 + play.lean.y * 0.24) * (1 - flat),
    yaw: (-0.16 + clamp(tilt.x, -1, 1) * 0.05 + play.lean.x * 0.32) * (1 - flat),
  };
}

/** SVG path of an arc's centre line (round caps come from the stroke), symbol units, y up. */
export function arcPath(radius: number, from: number, to: number) {
  const a0 = from * Math.PI / 180, a1 = to * Math.PI / 180;
  const p = (a: number) => `${(MARK.centre.x + radius * Math.cos(a)).toFixed(4)} ${(MARK.centre.y + radius * Math.sin(a)).toFixed(4)}`;
  return `M${p(a0)}A${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${p(a1)}`;
}
