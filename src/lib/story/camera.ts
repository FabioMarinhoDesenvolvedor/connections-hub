/*
  The story camera. It orbits the object's centre;
  `ortho` blends perspective (0) into orthographic (1) for the pixel-exact logo hand-off.
  The focus plane through the centre keeps `placement.scale` px per unit at every blend.
*/
export type Camera = { yaw: number; pitch: number; distance: number; ortho: number };
export type Vec3 = [number, number, number];

export function cameraBasis({ yaw, pitch }: Camera) {
  const back: Vec3 = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
  const right: Vec3 = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const up: Vec3 = [
    back[1] * right[2] - back[2] * right[1],
    back[2] * right[0] - back[0] * right[2],
    back[0] * right[1] - back[1] * right[0],
  ];
  return { right, up, back };
}
