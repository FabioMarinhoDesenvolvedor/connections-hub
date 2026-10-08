/*
  CONCEPT A — "Semente usinada" (machined seed)
  One physical object, built only from the official symbol's measurements:
    · the seed is a solid navy disc: the C, the piece that fills its gap, and a centre plug, flush;
    · opening: the plug sinks, the disc becomes the ring (manual p.8);
    · meeting point: the piece that closed the ring gathers into the dot — the gap segment of
      the official C, rounded, is the official dot's size (0.201 vs 0.205 symbol units);
    · hub: the sunken plug grows into the rounded square behind the C, and the C and the dot
      take the light colour of the official file, flowing from the meeting point;
    · the object turns frontal and flattens onto the official logo file.
*/
import * as THREE from 'three';
import { createStage, EXPOSURE, SYMBOL, BRAND, range, ease, smooth, mix } from './stage.js';
import { extrude, capsuleArc, roundedSquare, officialC } from './shapes.js';

const GAP_MID = (SYMBOL.gap.from + SYMBOL.gap.to) / 2;          // -0.69°
const OVERLAP = 15;                                             // gap piece hidden inside the C at rest
const DOT = {
  angle: Math.atan2(SYMBOL.dot.y - SYMBOL.centre.y, SYMBOL.dot.x - SYMBOL.centre.x) * 180 / Math.PI,
  radius: Math.hypot(SYMBOL.dot.y - SYMBOL.centre.y, SYMBOL.dot.x - SYMBOL.centre.x),
};
const DEPTH = 0.15;

function material(color, mode) { // mode: 'c' (ink flows along the C), 'dot' (whole piece), 'plain'
  const m = new THREE.MeshPhysicalMaterial({
    color, roughness: 0.6, metalness: 0, sheen: 0.4, sheenRoughness: 0.7,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.3), specularIntensity: 0.4,
  });
  m.userData.u = { uInk: { value: 0 }, uFlat: { value: 0 }, uTo: { value: BRAND.paper.clone() }, uMid: { value: GAP_MID }, uCx: { value: SYMBOL.centre.x }, uCy: { value: SYMBOL.centre.y }, uDot: { value: 0 } };
  m.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, m.userData.u);
    shader.vertexShader = 'varying vec3 vObj;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
    shader.fragmentShader = 'varying vec3 vObj;\nuniform float uInk, uFlat, uMid, uCx, uCy, uDot;\nuniform vec3 uTo;\n' + shader.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        ${mode === 'c' ? `
        float ang = degrees(atan(vObj.y - uCy, vObj.x - uCx));
        float rel = abs(mod(ang - uMid + 180.0, 360.0) - 180.0);   // 0 at the gap, 180 opposite
        float front = mix(36.0, 186.0, uInk);
        float k = max(uDot, 1.0 - smoothstep(front - 5.0, front + 5.0, rel));
        diffuseColor.rgb = mix(diffuseColor.rgb, uTo, k);` : mode === 'dot' ? 'diffuseColor.rgb = mix(diffuseColor.rgb, uTo, uDot);' : ''}`)
      .replace('#include <opaque_fragment>', `outgoingLight = mix(outgoingLight, diffuseColor.rgb / ${EXPOSURE.toFixed(4)}, uFlat);\n#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'a-' + mode;
  return m;
}

createStage({
  title: 'Conceito A — Semente usinada',
  async build() {
    const group = new THREE.Group();
    const navy = BRAND.navy;
    const mC = material(navy, 'c'), mPiece = material(navy, 'dot'), mPlug = material(navy, 'plain');
    const piece = new THREE.Mesh(undefined, mPiece);
    const plug = new THREE.Mesh(undefined, mPlug);
    const c = new THREE.Mesh(extrude(await officialC(), DEPTH, 0.016), mC);
    for (const m of [c, piece, plug]) { m.castShadow = m.receiveShadow = true; group.add(m); }

    const cache = new Map();
    const geometry = (mesh, key, make) => {
      if (mesh.userData.key === key) return;
      mesh.geometry?.dispose();
      mesh.geometry = make();
      mesh.userData.key = key;
    };

    const update = (p, rig) => {
      // Opening: the plug sinks into the disc.
      const open = ease(range(p, 0.22, 0.38));
      // Meeting point: the gap piece contracts, then settles on the official dot.
      const gather = ease(range(p, 0.44, 0.57));
      const settle = ease(range(p, 0.55, 0.64));
      // Hub: the sunken plug grows into the tile behind the C; colour flows from the dot.
      const hub = ease(range(p, 0.68, 0.8));
      const dotInk = smooth(range(p, 0.6, 0.635));
      const ink = smooth(range(p, 0.625, 0.7));
      // Finale: frontal, then flat on the official file.
      const flat = ease(range(p, 0.82, 0.9));

      const sweep = mix(SYMBOL.gap.to - SYMBOL.gap.from + 2 * OVERLAP, 0, gather);
      const angle = mix(GAP_MID, DOT.angle, settle);
      const radius = mix(SYMBOL.mid, DOT.radius, settle);
      const half = mix(SYMBOL.band / 2, SYMBOL.dot.r, settle);
      geometry(piece, `${sweep.toFixed(3)}|${angle.toFixed(3)}|${radius.toFixed(4)}|${half.toFixed(4)}`,
        () => extrude(capsuleArc({ radius, half, from: angle - sweep / 2, to: angle + sweep / 2 }), DEPTH, 0.016));
      piece.position.z = 0.05 * Math.sin(Math.PI * gather);

      const tHalf = mix(SYMBOL.inner.r, 1, hub);
      const corner = mix(SYMBOL.inner.r, SYMBOL.corner, hub);
      const cx = mix(SYMBOL.inner.x, 0, hub), cy = mix(SYMBOL.inner.y, 0, hub);
      // The plug's back stays on the C's back plane while its face sinks (a recess, never a
      // hole); before growing it retreats fully behind the C, then thickens into the tile.
      const back = mix(-DEPTH / 2, -DEPTH * 1.5, hub);
      const retreat = ease(range(p, 0.64, 0.685));
      const front = retreat > 0 ? mix(DEPTH / 2 - 0.11, -DEPTH / 2, retreat) : DEPTH / 2 - 0.11 * open;
      const plugDepth = Math.max(0.004, front - back);
      geometry(plug, `${tHalf.toFixed(4)}|${corner.toFixed(4)}|${cx.toFixed(4)}|${plugDepth.toFixed(4)}`,
        () => extrude(roundedSquare({ cx, cy, half: tHalf, corner }), plugDepth, Math.min(0.016, plugDepth / 2.2)));
      plug.position.z = (front + back) / 2;

      for (const m of [mC, mPiece, mPlug]) m.userData.u.uFlat.value = flat;
      mC.userData.u.uInk.value = ink;
      mPiece.userData.u.uDot.value = dotInk;

      // Pose: a fixed three-quarter view; it turns a little further only while the plug sinks,
      // so the new depth reads, and lies frontal for the hand-off.
      const look = Math.sin(Math.PI * open) * (1 - hub);
      group.rotation.y = (0.3 + 0.12 * look) * (1 - flat) + rig.pointer.x * 0.05 * (1 - flat);
      group.rotation.x = (0.13 + 0.04 * look) * (1 - flat) + rig.pointer.y * 0.04 * (1 - flat);
      group.scale.z = mix(1, 0.02, flat);
      rig.page.position.z = rig.holder.position.z - 0.42 * rig.holder.scale.x;
    };
    return { group, update };
  },
});
