/*
  The story camera, shared by the shader (uniforms) and the DOM overlay (projection), so
  annotations sit exactly on the rendered geometry. The camera orbits the object's centre;
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

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** World point → CSS px, given where the object's centre sits on screen and its scale. */
export function project(point: Vec3, camera: Camera, placement: { x: number; y: number; scale: number }) {
  const { right, up, back } = cameraBasis(camera);
  const rel: Vec3 = [point[0] - back[0] * camera.distance, point[1] - back[1] * camera.distance, point[2] - back[2] * camera.distance];
  const depth = -dot(rel, back);
  const k = camera.ortho + (depth / camera.distance) * (1 - camera.ortho);
  return { x: placement.x + (dot(rel, right) / k) * placement.scale, y: placement.y - (dot(rel, up) / k) * placement.scale };
}
