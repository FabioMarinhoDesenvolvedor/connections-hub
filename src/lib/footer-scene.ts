import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { patchTubeShader, setTube, tubeUniforms } from './tube';

/*
  The footer signature, assembled in 3D from the official horizontal logo (sand + orange).
  Each "o" of the name is the brand's C closed by an orange arc — the concept itself — so
  the two o's retell it: a seed opens into a ring, the ring opens into a C and the orange
  meeting point appears in the gap. The other letters rise from the wall in reading order.
  It then squares up, flat unlit twins take the exact official colours and the SVG under
  the canvas takes over. Progress (0 → 1) is played once the signature is in view: the
  footer sits at the end of the page, where there is too little scroll to drive it.
*/

export type FooterScene = {
  setProgress: (progress: number) => void;
  /** Jump back to the start without animating (used while the footer is off screen). */
  reset: () => void;
  setPointer: (x: number, y: number) => void;
  dispose: () => void;
};

const SAND = '#e8d8c5';
const ORANGE = '#c16042';
const SVG_WIDTH = 2977.82;
const SVG_HEIGHT = 295.93;
// The two o's, measured from the file: centre, ring mid-radius; the second opens left.
const O_RINGS = [
  { x: 305, y: 191.75, turn: 0 },
  { x: 1647.5, y: 191.75, turn: Math.PI },
];
const O_RADIUS = 87.75;
// Relief: letter fronts sit at +16 SVG units, where the tubes' fronts are.
const DEPTH = 30;
const FRONT = 16;
const FOV = 30;
const VIEW_HEIGHT = 2 * 10 * Math.tan((FOV / 2) * Math.PI / 180);

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
const ease = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

type Options = { compact: boolean; onFrame?: (progress: number) => void };

export function createFooterScene(host: HTMLElement, mark: HTMLImageElement, { compact, onFrame }: Options): FooterScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  let dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.035).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.55;
  room.dispose?.();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80);
  camera.position.set(0, 0, 10);
  const key = new THREE.DirectionalLight('#fff4e4', 1.4);
  key.position.set(-4, 6, 6);
  const rim = new THREE.DirectionalLight('#CCD6DB', 0.8);
  rim.position.set(5, 3, -6);
  scene.add(key, rim);

  const sandMaterial = new THREE.MeshPhysicalMaterial({ color: SAND, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.4 });
  const orangeMaterial = new THREE.MeshPhysicalMaterial({ color: ORANGE, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.4 });
  const materials: THREE.Material[] = [sandMaterial, orangeMaterial];
  const geometries: THREE.BufferGeometry[] = [];

  // Everything lives in SVG units, centred on the file, y up, then the rig maps it to the page.
  const rig = new THREE.Group();
  scene.add(rig);
  const toLocal = new THREE.Matrix4().makeScale(1, -1, -1).premultiply(new THREE.Matrix4().makeTranslation(-SVG_WIDTH / 2, SVG_HEIGHT / 2, 0));

  // The two o's: parametric C (seed → ring → C) closed by an orange ring behind the gap.
  const surfaceGeometry = new THREE.PlaneGeometry(1, 1, compact ? 120 : 180, compact ? 32 : 44);
  surfaceGeometry.setAttribute('aParam', surfaceGeometry.getAttribute('uv').clone());
  const sphereGeometry = new THREE.SphereGeometry(1, 40, 28);
  const ringGeometry = new THREE.TorusGeometry(1, 0.182, 24, compact ? 72 : 110);
  geometries.push(surfaceGeometry, sphereGeometry, ringGeometry);
  const rings = O_RINGS.map((o, index) => {
    const uniforms = tubeUniforms();
    const tubeMaterial = new THREE.MeshPhysicalMaterial({ color: SAND, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.4 });
    tubeMaterial.customProgramCacheKey = () => `footer-tube-${index}`;
    tubeMaterial.onBeforeCompile = shader => patchTubeShader(shader, uniforms);
    materials.push(tubeMaterial);
    const surface = new THREE.Mesh(surfaceGeometry, tubeMaterial);
    surface.frustumCulled = false;
    const capA = new THREE.Mesh(sphereGeometry, sandMaterial);
    const capB = new THREE.Mesh(sphereGeometry, sandMaterial);
    const orange = new THREE.Mesh(ringGeometry, orangeMaterial);
    orange.position.z = -0.03;
    const group = new THREE.Group();
    group.add(surface, capA, capB, orange);
    group.position.set(o.x - SVG_WIDTH / 2, -(o.y - SVG_HEIGHT / 2), 0);
    group.rotation.z = o.turn;
    group.scale.setScalar(O_RADIUS);
    rig.add(group);
    return { uniforms, group, capA, capB, orange };
  });

  type Letter = { group: THREE.Group; order: number };
  const letters: Letter[] = [];
  const flats: THREE.Mesh[] = [];
  let ready = false;

  const build = (source: string) => {
    const data = new SVGLoader().parse(source);
    const letterParts: { shapes: THREE.Shape[]; box: THREE.Box2 }[] = [];
    data.paths.forEach((path, layer) => {
      const fill = String(path.userData?.style?.fill ?? '').toLowerCase();
      const shapes = SVGLoader.createShapes(path);
      if (!shapes.length) return;
      const box = new THREE.Box2();
      for (const shape of shapes) for (const point of shape.getPoints()) box.expandByPoint(point);
      // Flat twin of every official path, in its original stacking order.
      const face = new THREE.ShapeGeometry(shapes, compact ? 8 : 12);
      face.applyMatrix4(toLocal);
      // Where the pressed-flat relief ends up (front × 0.02), so the swap is pixel-aligned.
      face.translate(0, 0, FRONT * 0.02 + 0.2);
      const flat = new THREE.Mesh(face, new THREE.MeshBasicMaterial({ color: fill || SAND, toneMapped: false, transparent: true, opacity: 0, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
      flat.renderOrder = 2 + layer / 100;
      flat.visible = false;
      rig.add(flat);
      flats.push(flat);
      geometries.push(face);
      materials.push(flat.material as THREE.Material);
      // The o's (the orange arcs and the sand C's around them) are the parametric rings.
      const isO = O_RINGS.some(o => box.min.x < o.x && box.max.x > o.x && box.min.y < o.y && box.max.y > o.y) || fill === ORANGE;
      if (!isO) letterParts.push({ shapes, box });
    });
    letterParts.sort((a, b) => a.box.min.x - b.box.min.x);
    letterParts.forEach(({ shapes, box }, order) => {
      const solid = new THREE.ExtrudeGeometry(shapes, { depth: DEPTH, bevelEnabled: true, bevelThickness: 3, bevelSize: 2, bevelOffset: -2, bevelSegments: 3, curveSegments: compact ? 8 : 12 });
      solid.applyMatrix4(toLocal);
      // After the flip the extrusion runs 0 → −DEPTH: bring its front to FRONT.
      solid.translate(0, 0, FRONT - 3);
      // Pivot on the letter's own baseline so it can turn up into place.
      const pivot = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, 0).applyMatrix4(toLocal);
      solid.translate(-pivot.x, -pivot.y, 0);
      const group = new THREE.Group();
      group.position.set(pivot.x, pivot.y, 0);
      group.add(new THREE.Mesh(solid, sandMaterial));
      group.visible = false;
      rig.add(group);
      letters.push({ group, order });
      geometries.push(solid);
    });
    ready = true;
    renderer.compile(scene, camera);
    run();
  };
  fetch(mark.currentSrc || mark.src).then(response => response.text()).then(build).catch(() => { host.dataset.ready = 'false'; });

  let width = 1;
  let height = 1;
  let target = 0;
  let progress = -1;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let visible = true;
  let frame = 0;
  let last = performance.now();
  let slow = 0;

  const resize = () => {
    width = host.clientWidth || 1;
    height = host.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const compose = (p: number) => {
    // Map the official image's box (the landing) into world units.
    const box = mark.getBoundingClientRect();
    const stage = host.getBoundingClientRect();
    const pxPerUnit = height / VIEW_HEIGHT;
    const scale = box.width / pxPerUnit / SVG_WIDTH;
    const settle = easeInOut(range(p, 0.1, 0.8));
    rig.position.set(
      (box.left - stage.left + box.width / 2 - width / 2) / pxPerUnit,
      (height / 2 - (box.top - stage.top + box.height / 2)) / pxPerUnit + (1 - settle) * 0.35,
      0,
    );
    rig.scale.setScalar(scale);
    const hand = 1 - range(p, 0.75, 0.85);
    // As it lands, the relief presses flat into the wall, so the handover to the printed
    // SVG shows no side faces disappearing.
    // Pressed flat, the relief matches the printed file pixel for pixel: an instant swap is
    // invisible, and avoids blending the stacked official layers.
    const flatten = p >= 0.88 ? 1 : 0;
    const depth = mix(1, 0.02, ease(range(p, 0.76, 0.87)));
    rig.rotation.set(mix(0.42, 0, settle) + pointer.y * 0.1 * hand, mix(-0.28, 0, settle) + pointer.x * 0.14 * hand, 0);

    // The o's retell the concept: seed → ring → C, the orange meeting point in the gap.
    rings.forEach((ring, index) => {
      const lag = index * 0.06;
      const seed = easeOut(range(p, 0.02 + lag, 0.16 + lag));
      const open = ease(range(p, 0.16 + lag, 0.44 + lag));
      const split = easeOut(range(p, 0.4 + lag, 0.6 + lag));
      const meet = easeOut(range(p, 0.44 + lag, 0.64 + lag));
      const { start, end, radius } = setTube(ring.uniforms, open, split);
      ring.capA.position.set(open * Math.cos(start), open * Math.sin(start), 0);
      ring.capB.position.set(open * Math.cos(end), open * Math.sin(end), 0);
      ring.capA.scale.setScalar(radius);
      ring.capB.scale.setScalar(radius);
      ring.group.visible = seed > 0.001;
      // The seed is born small, beside the letters' scale, and grows as it opens.
      const size = O_RADIUS * mix(0.3, 1, seed) * mix(0.62, 1, open);
      ring.group.scale.set(size, size, size * depth);
      ring.orange.visible = meet > 0.001;
      ring.orange.scale.setScalar(mix(0.7, 1, meet));
      ring.orange.position.z = mix(-0.6, -0.03, meet) * depth;
    });

    // Letters rise out of the wall, left to right, turning up on their baselines.
    const count = Math.max(1, letters.length);
    for (const letter of letters) {
      const begin = 0.08 + (letter.order / count) * 0.42;
      const t = easeOut(range(p, begin, begin + 0.24));
      letter.group.visible = t > 0.001;
      letter.group.position.z = mix(-60, 0, t);
      letter.group.rotation.x = mix(-1.35, 0, t);
      const size = mix(0.7, 1, t);
      letter.group.scale.set(size, size, size * depth);
    }

    // Square to the viewer, lamps ease off, and the flat twins take the exact colours.
    key.intensity = mix(1.4, 0.3, settle);
    rim.intensity = mix(0.8, 0, settle);
    for (const flat of flats) {
      (flat.material as THREE.MeshBasicMaterial).opacity = flatten;
      flat.visible = flatten > 0.001;
    }
  };

  const tick = (now: number) => {
    frame = 0;
    if (!visible) return;
    const delta = Math.min(now - last, 100);
    last = now;
    if (delta > 28 && delta < 100) slow++; else slow = Math.max(0, slow - 1);
    if (slow > 40 && dpr > 1) { dpr = 1; renderer.setPixelRatio(dpr); resize(); slow = 0; }
    const follow = 1 - Math.exp(-delta / 1000 * 5.5);
    const hand = 1 - Math.exp(-delta / 1000 * 3);
    progress = progress < 0 ? target : progress + (target - progress) * follow;
    pointer.x += (pointer.tx - pointer.x) * hand;
    pointer.y += (pointer.ty - pointer.y) * hand;
    onFrame?.(progress);
    if (ready) {
      compose(progress);
      renderer.render(scene, camera);
    }
    // Once handed over to the SVG and at rest, stop drawing.
    const resting = progress > 0.97 && Math.abs(target - progress) < 0.001;
    if (!resting) frame = requestAnimationFrame(tick);
  };
  const run = () => { if (!frame && visible) { last = performance.now(); frame = requestAnimationFrame(tick); } };
  const stop = () => { if (frame) cancelAnimationFrame(frame); frame = 0; };

  const resizeObserver = new ResizeObserver(() => { resize(); run(); });
  resizeObserver.observe(host);
  const viewObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && document.visibilityState === 'visible';
    if (visible) run(); else stop();
  });
  viewObserver.observe(host);
  const onLost = (event: Event) => { event.preventDefault(); stop(); host.dataset.ready = 'false'; };
  renderer.domElement.addEventListener('webglcontextlost', onLost);

  resize();
  host.dataset.ready = 'true';
  run();

  return {
    setProgress: value => { target = clamp(value); run(); },
    reset: () => { target = 0; progress = 0; onFrame?.(0); run(); },
    setPointer: (x, y) => { pointer.tx = x; pointer.ty = y; run(); },
    dispose: () => {
      stop();
      resizeObserver.disconnect();
      viewObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      delete host.dataset.ready;
    },
  };
}
