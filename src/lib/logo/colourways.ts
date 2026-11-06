/*
  The symbol's official colourways (symbol-navy, logo-light, symbol-light, logo), shared by the
  3D renderer and the swatches beside it, so the page can show them without loading three.js.
*/
const NAVY = '#183255', ORANGE = '#C16042', PAPER = '#F8F6F0';
export const COLOURWAYS = [
  { tile: NAVY, mark: ORANGE, sheen: '#9FB2CC' },
  { tile: ORANGE, mark: PAPER, sheen: '#F2C7B4' },
  { tile: PAPER, mark: NAVY, sheen: '#FFFFFF' },
  { tile: NAVY, mark: PAPER, sheen: '#9FB2CC' },
] as const;
