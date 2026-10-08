/*
  CONCEPT B — "Órbitas" (abstract brand transformation)
  No volume, no sphere: thin cut card in the brand palette, layered a few millimetres apart
  and lit low from the left, so depth is carried by shadow, the way paper sculpture is shot.
    · the seed is a navy point;
    · opening: it releases concentric arcs (the manual's ring vocabulary) that turn like dials
      at different speeds — possibilities in motion;
    · meeting point: the dials slow, close onto one radius and lock into the four segments of
      the official C; the seed travels out to become the dot in the C's gap;
    · hub: the navy tile slides in beneath; the layers settle onto it;
    · everything flattens onto the official logo file.
*/
import * as THREE from 'three';
import { createStage, EXPOSURE, SYMBOL, BRAND, range, ease, smooth, mix } from './stage.js';
import { extrude, capsuleArc, roundedSquare, disc, officialC } from './shapes.js';

const CARD = 0.035;                       // card thickness, symbol units
const C_FROM = SYMBOL.gap.to, C_TO = SYMBOL.gap.from + 360; // the C runs 43.1° → 315.5°
const CAP = (SYMBOL.band / 2) / SYMBOL.mid * 180 / Math.PI;  // a round end's angular reach
// Each arc: its own orbit while open, then one quarter of the C.
const ARCS = [
  { r: 0.30, half: 0.030, sweep: 150, phase: 40, speed: 160, color: BRAND.orange, lift: 4 },
  { r: 0.48, half: 0.045, sweep: 210, phase: 200, speed: -110, color: BRAND.navy, lift: 3 },
  { r: 0.68, half: 0.035, sweep: 120, phase: 300, speed: 80, color: BRAND.sand, lift: 2 },
  { r: 0.86, half: 0.028, sweep: 250, phase: 120, speed: -55, color: BRAND.paper, lift: 1 },
];
const LAYER = 0.05;

function card(color, sheen = 0.2) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.86, metalness: 0, sheen, sheenRoughness: 0.9, sheenColor: new THREE.Color('#ffffff'), specularIntensity: 0.2 });
  m.userData.u = { uFlat: { value: 0 } };
  m.onBeforeCompile = shader => {
    shader.uniforms.uFlat = m.userData.u.uFlat;
    shader.fragmentShader = 'uniform float uFlat;\n' + shader.fragmentShader.replace('#include <opaque_fragment>', `outgoingLight = mix(outgoingLight, diffuseColor.rgb / ${EXPOSURE.toFixed(4)}, uFlat);\n#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'card';
  return m;
}

createStage({
  title: 'Conceito B — Órbitas',
  async build(scene, rig) {
    const group = new THREE.Group();
    const make = (color, parent = group, sheen) => { const m = new THREE.Mesh(undefined, card(color, sheen)); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
    // Two-sided card: brand colour on the face, paper on the back; a pivot turns it over.
    const twoSided = color => {
      const pivot = new THREE.Group(); group.add(pivot);
      const face = make(color, pivot), back = make(BRAND.paper.clone(), pivot);
      face.position.z = CARD / 2 + 0.002; back.position.z = -CARD / 2 - 0.002;
      return { pivot, face, back };
    };
    const arcs = ARCS.map(a => twoSided(a.color.clone()));
    const seed = twoSided(BRAND.navy.clone());
    const tile = make(BRAND.navy.clone(), group, 0);
    const c = make(BRAND.paper.clone());
    const axis = new THREE.Vector3();
    const shareGeometry = (side, key, build) => { if (side.face.userData.key !== key) { side.face.geometry?.dispose(); side.face.geometry = side.back.geometry = build(); side.face.userData.key = key; } };
    c.geometry = extrude(await officialC(), CARD, 0.008, 4);
    c.position.z = CARD / 2 + CARD / 2 + 0.002;
    const set = (mesh, key, build) => { if (mesh.userData.key !== key) { mesh.geometry?.dispose(); mesh.geometry = build(); mesh.userData.key = key; } };
    rig.keyAngle = [-4.5, 4.5, 10]; // lower key: card edges throw readable shadows

    const update = (p, rig) => {
      const release = ease(range(p, 0.22, 0.42));   // arcs leave the seed
      const lock = ease(range(p, 0.44, 0.6));       // dials close onto the C
      const travel = ease(range(p, 0.5, 0.63));     // seed → meeting point
      const hub = ease(range(p, 0.65, 0.79));       // tile slides in, layers settle
      const fuse = smooth(range(p, 0.74, 0.8));     // segments become one C
      const flat = ease(range(p, 0.82, 0.9));
      const spin = range(p, 0.18, 0.6);
      const slow = 1 - (1 - spin) * (1 - spin);      // dials decelerate into place

      ARCS.forEach((a, i) => {
        // open state: own orbit; locked state: quarter i of the C (round ends included)
        const span = (C_TO - C_FROM - 2 * CAP) / 4;
        const lockedFrom = C_FROM + CAP + span * i, lockedTo = lockedFrom + span;
        const openMid = a.phase + a.speed * slow;
        const openFrom = openMid - a.sweep * release / 2, openTo = openMid + a.sweep * release / 2;
        const from = mix(openFrom, lockedFrom, lock), to = mix(openTo, lockedTo, lock);
        const radius = mix(mix(0.12, a.r, release), SYMBOL.mid, lock);
        const half = mix(a.half, SYMBOL.band / 2, lock) * smooth(range(release, 0, 0.25));
        shareGeometry(arcs[i], `${from.toFixed(2)}|${to.toFixed(2)}|${radius.toFixed(4)}|${half.toFixed(4)}`,
          () => extrude(capsuleArc({ radius, half: Math.max(half, 0.002), from, to }), CARD, Math.min(0.008, half * 0.4), 4));
        arcs[i].pivot.visible = half > 0.003 && fuse < 1;
        // locked segments turn over one after another, about their own centre line
        const turn = ease(range(p, 0.585 + i * 0.022, 0.64 + i * 0.022));
        const mid = (from + to) / 2 * Math.PI / 180;
        axis.set(Math.cos(mid), Math.sin(mid), 0);
        arcs[i].pivot.quaternion.setFromAxisAngle(axis, Math.PI * turn);
        arcs[i].pivot.position.set(0, 0, mix(a.lift * LAYER, CARD / 2, hub));
      });
      c.visible = fuse >= 1;

      // seed: a full navy point that gives up its size to the arcs, then travels to the gap
      const seedR = mix(0.34, SYMBOL.dot.r, release);
      const sx = mix(SYMBOL.centre.x, SYMBOL.dot.x, travel), sy = mix(SYMBOL.centre.y, SYMBOL.dot.y, travel);
      shareGeometry(seed, seedR.toFixed(4), () => extrude(disc({ cx: 0, cy: 0, r: seedR }), CARD, 0.008, 4));
      seed.pivot.position.set(sx, sy, mix(3 * LAYER + 2 * LAYER * release, CARD / 2, hub));
      // it turns over on the way out: navy seed, light meeting point
      seed.pivot.rotation.y = Math.PI * ease(range(p, 0.53, 0.63));

      // tile: the hub opens out from beneath the meeting point and squares into the official tile
      const tHalf = mix(SYMBOL.dot.r * 0.9, 1, hub), corner = Math.min(tHalf, mix(SYMBOL.dot.r, SYMBOL.corner, hub));
      const tx = mix(SYMBOL.dot.x, 0, hub), ty = mix(SYMBOL.dot.y, 0, hub);
      set(tile, `${tHalf.toFixed(4)}|${corner.toFixed(4)}|${tx.toFixed(4)}`, () => extrude(roundedSquare({ cx: tx, cy: ty, half: tHalf, corner }), CARD * 1.6, 0.008, 4));
      tile.visible = hub > 0.001;
      tile.position.z = -CARD * 0.8;

      for (const m of [...arcs.flatMap(a => [a.face, a.back]), seed.face, seed.back, tile, c]) m.material.userData.u.uFlat.value = flat;

      // Fixed, slightly raised viewpoint so the layering reads; frontal for the hand-off.
      const depthLook = 1 - flat;
      group.rotation.x = (0.2 + rig.pointer.y * 0.04) * depthLook;
      group.rotation.y = (-0.16 + rig.pointer.x * 0.05) * depthLook;
      group.scale.z = mix(1, 0.02, flat);
      rig.page.position.z = rig.holder.position.z - 0.3 * rig.holder.scale.x; // clear of the tilted tile
    };
    return { group, update };
  },
});
