/*
  Symbol geometry, measured from the official logo.svg (viewBox 1407.79 × 311.32).
  World units: 1 unit = 100 SVG units, origin at the tile centre, y up.
*/
export const TILE = { cx: 141.39, cy: 169.44, half: 141.39, radius: 72.76 } as const;
const SVG_TO_WORLD = 1 / 100;

export const SYMBOL = {
  tileHalf: TILE.half * SVG_TO_WORLD,
  tileRadius: TILE.radius * SVG_TO_WORLD,
  ring: {
    x: (139.89 - TILE.cx) * SVG_TO_WORLD,
    y: (TILE.cy - 169.36) * SVG_TO_WORLD,
    outer: 93.42 * SVG_TO_WORLD,
    inner: 64.47 * SVG_TO_WORLD,
  },
  dot: { x: (221.79 - TILE.cx) * SVG_TO_WORLD, y: (TILE.cy - 190.93) * SVG_TO_WORLD, r: 14.52 * SVG_TO_WORLD },
} as const;
