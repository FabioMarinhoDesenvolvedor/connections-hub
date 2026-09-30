import type * as THREE from 'three';

/*
  The brand's C as one parametric surface: a torus section whose major radius, tube radius
  and arc are uniforms. Major radius 0 → a sphere (the seed); growing it opens the ring;
  shortening the arc opens the C. Shared by the concept story and the footer signature.
*/

export const TAU = Math.PI * 2;
// Measured from the official files (ring radius = 1): tube half-thickness and the arc ends,
// round caps included, for a C that opens to the right.
export const TUBE = 0.182;
export const GAP_START = 0.967;
export const GAP_END = 0.984;

export type TubeUniforms = {
  uR: { value: number };
  ur: { value: number };
  uStart: { value: number };
  uArc: { value: number };
};

export const tubeUniforms = (): TubeUniforms => ({ uR: { value: 0 }, ur: { value: 1.08 }, uStart: { value: 0 }, uArc: { value: TAU } });

export function patchTubeShader(shader: THREE.WebGLProgramParametersWithUniforms, uniforms: TubeUniforms) {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>
      attribute vec2 aParam;
      uniform float uR; uniform float ur; uniform float uStart; uniform float uArc;
      vec3 tubeNormal() {
        float th = uStart + aParam.x * uArc;
        float ph = aParam.y * 6.28318530718;
        vec3 n = vec3(cos(ph) * cos(th), cos(ph) * sin(th), sin(ph));
        // Near the axis of an opening seed, lean the normal toward the axis so the dimple's
        // centre shades softly instead of catching a star-shaped highlight.
        float nearAxis = 1.0 - smoothstep(0.0, 0.35 * ur, uR + ur * cos(ph));
        vec3 axis = vec3(0.0, 0.0, sin(ph) >= 0.0 ? 1.0 : -1.0);
        return normalize(mix(n, axis, nearAxis * step(uR, ur)));
      }
      vec3 tubePosition() {
        float th = uStart + aParam.x * uArc;
        float ph = aParam.y * 6.28318530718;
        // While the seed opens (ring radius < tube radius) the inner surface would fold
        // through the axis and leave a crease; clamping it to the axis gives a smooth,
        // apple-like dimple instead — a bud opening.
        float spread = max(uR + ur * cos(ph), 0.0);
        return vec3(spread * cos(th), spread * sin(th), ur * sin(ph));
      }`)
    // Unlit materials skip the normal chunk, so the position never depends on it.
    .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = tubeNormal();')
    .replace('#include <begin_vertex>', 'vec3 transformed = tubePosition();');
}

/** Seed → ring → C, driven by `open` (0 → 1) and `split` (0 → 1). Returns the cap angles. */
export function setTube(uniforms: TubeUniforms, open: number, split: number) {
  uniforms.uR.value = open;
  uniforms.ur.value = 1.08 + (TUBE - 1.08) * Math.sqrt(open);
  uniforms.uStart.value = GAP_START * split;
  uniforms.uArc.value = TAU - (GAP_START + GAP_END) * split;
  return { start: uniforms.uStart.value, end: uniforms.uStart.value + uniforms.uArc.value, radius: uniforms.ur.value * 0.996 };
}
