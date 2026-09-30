import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { patchTubeShader, setTube, tubeUniforms } from './tube';

/*
  Manual p.8 — CONCEITO, told in three dimensions, then the hub assembles itself.

  Story (in chapter units c, 0 → 5, one unit per viewport of scroll):
    0  hero: the seed
    1  01 — the seed moves to the stage
    2  02 — it opens into a ring
    3  03 — the ring opens and the meeting point docks
    3.3–4.5  finale, in beats: the piece turns to show its depth; the navy hub grows out of
             the C's centre; as it passes behind the C, the C inverts to off-white (navy on
             light becomes light on navy, as in the logo); the C presses into the hub; the
             camera pulls back and the name rises letter by letter; the object presents
             itself and lands face-on exactly on the lockup's symbol
    4.5+ the object turns into the flat official SVG under it (identical pixels), and the
             name rises line by line (HTML, official file, clip only)

  One parametric surface does the seed → ring → C morph: a torus section whose major
  radius, tube radius and arc are uniforms. With a major radius of zero it is a sphere.
*/

export type Landing = { x: number; y: number; radius: number };
export type ConceptScene = {
  setProgress: (chapter: number) => void;
  setLanding: (landing: Landing) => void;
  setPointer: (x: number, y: number) => void;
  dispose: () => void;
};

const NAVY = '#183255';
const OFF_WHITE = '#F8F6F0';
// Measured by rasterising the official lockup (C ring radius = 1).
const DOT = 0.183;
const DOT_DISTANCE = 1.063;
const DOT_ANGLE = -0.258;
// Symbol tile: 282.78 units wide, corner 72.76, C ring radius 79.3, tile centre 1.09 right of the C centre.
const TILE_HALF = 141.39 / 79.3;
const TILE_CORNER = 72.76 / 79.3;
const TILE_OFFSET = 1.09 / 79.3;
// Lockup (logo.svg, 1407.79 × 311.32) in C units: C centre (140.3, 169.44), ring radius 79.3.
const SVG_UNIT = 79.3;
const SVG_ORIGIN = { x: 140.3, y: 169.44 };
const LOCKUP_WIDTH = 1407.79 / SVG_UNIT;
const LOCKUP_CENTRE = { x: (703.9 - SVG_ORIGIN.x) / SVG_UNIT, y: -(155.66 - SVG_ORIGIN.y) / SVG_UNIT };
const FOV = 30;
const VIEW_HEIGHT = 2 * 10 * Math.tan((FOV / 2) * Math.PI / 180);
const CHAPTERS = 5;

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
const ease = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

type Options = { compact: boolean; onFrame?: (chapter: number) => void };

function tileShape(h: number, r: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-h + r, -h);
  shape.lineTo(h - r, -h);
  shape.quadraticCurveTo(h, -h, h, -h + r);
  shape.lineTo(h, h - r);
  shape.quadraticCurveTo(h, h, h - r, h);
  shape.lineTo(-h + r, h);
  shape.quadraticCurveTo(-h, h, -h, h - r);
  shape.lineTo(-h, -h + r);
  shape.quadraticCurveTo(-h, -h, -h + r, -h);
  return shape;
}

function roundedTile(bevel: number, depth: number, curve: number) {
  // The bevel grows the outline back to the exact symbol size.
  const shape = tileShape(TILE_HALF - bevel, TILE_CORNER - bevel);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 6, curveSegments: curve,
  });
  // Front face slightly behind the C centre, so the C sits in relief on the tile.
  geometry.translate(TILE_OFFSET, 0, -0.06 - depth - bevel);
  return geometry;
}

export function createConceptScene(host: HTMLElement, { compact, onFrame }: Options): ConceptScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  const maxDpr = compact ? 1.5 : 1.75;
  let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.035).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.6;
  room.dispose?.();

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
  camera.position.set(0, 0, 10);

  // Daylight, as the manual's photography asks: warm key, sand bounce, cool rim.
  const key = new THREE.DirectionalLight('#fff4e4', 1.5);
  key.position.set(-4, 6, 6);
  const bounce = new THREE.DirectionalLight('#E8D8C5', 0.3);
  bounce.position.set(3, -5, 3);
  const rim = new THREE.DirectionalLight('#CCD6DB', 0.7);
  rim.position.set(5, 3, -6);
  scene.add(key, bounce, rim);

  // Satin ceramic. The C and the dot share a colour that travels navy → off-white.
  const navy = new THREE.Color(NAVY);
  // Small and far back, the hub catches proportionally more light: it starts a shade deeper
  // so it reads as the brand navy from its first frame.
  const navyDeep = navy.clone().multiplyScalar(0.62);
  const offWhite = new THREE.Color(OFF_WHITE);
  const finish = { color: NAVY, roughness: 0.42, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.5, sheen: 0.12, sheenColor: new THREE.Color('#E8D8C5'), sheenRoughness: 0.9 };
  const material = new THREE.MeshPhysicalMaterial(finish);
  const sphereMaterial = new THREE.MeshPhysicalMaterial(finish);
  const tileMaterial = new THREE.MeshPhysicalMaterial({ color: NAVY, roughness: 0.5, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  material.customProgramCacheKey = () => 'concept-tube';
  const uniforms = tubeUniforms();
  const tubeShader = (shader: THREE.WebGLProgramParametersWithUniforms) => patchTubeShader(shader, uniforms);
  material.onBeforeCompile = tubeShader;

  // Flat, unlit, not tone-mapped twins for the last instant: they output exactly the SVG's
  // #183255 and #F8F6F0, so the canvas can step aside without a visible seam.
  const flat = (color: string) => new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
  const flatMaterial = flat(OFF_WHITE);
  const flatSphereMaterial = flat(OFF_WHITE);
  const flatTileMaterial = flat(NAVY);
  flatMaterial.customProgramCacheKey = () => 'concept-tube-flat';
  flatMaterial.onBeforeCompile = tubeShader;

  const surfaceGeometry = new THREE.PlaneGeometry(1, 1, compact ? 160 : 240, compact ? 40 : 56);
  surfaceGeometry.setAttribute('aParam', surfaceGeometry.getAttribute('uv').clone());
  const sphereGeometry = new THREE.SphereGeometry(1, compact ? 40 : 56, compact ? 28 : 40);
  const tileGeometry = roundedTile(0.09, 0.34, compact ? 16 : 28);
  // Flat twin of the tile, as seen from the front: the exact symbol outline.
  const flatTileGeometry = new THREE.ShapeGeometry(tileShape(TILE_HALF, TILE_CORNER), 32);
  flatTileGeometry.translate(TILE_OFFSET, 0, -0.06);

  const surface = new THREE.Mesh(surfaceGeometry, material);
  surface.frustumCulled = false;
  const capA = new THREE.Mesh(sphereGeometry, sphereMaterial);
  const capB = new THREE.Mesh(sphereGeometry, sphereMaterial);
  const dot = new THREE.Mesh(sphereGeometry, sphereMaterial);
  const flatSurface = new THREE.Mesh(surfaceGeometry, flatMaterial);
  flatSurface.frustumCulled = false;
  const flatParts = [capA, capB, dot].map(() => new THREE.Mesh(sphereGeometry, flatSphereMaterial));
  for (const mesh of [flatSurface, ...flatParts]) mesh.renderOrder = 3;

  const tile = new THREE.Mesh(tileGeometry, tileMaterial);
  const flatTile = new THREE.Mesh(flatTileGeometry, flatTileMaterial);
  flatTile.renderOrder = 2;

  // emblem = the C and its meeting point; tile = the hub it sets into.
  const emblem = new THREE.Group();
  emblem.add(surface, capA, capB, dot, flatSurface, ...flatParts);
  const tileRig = new THREE.Group();
  tileRig.add(tile);
  const rig = new THREE.Group();
  rig.add(tileRig, flatTile, emblem);
  scene.add(rig);

  /*
    The name, in 3D, from the official vector paths of logo.svg (never redrawn): each path
    is extruded like the brand's own wall signage and rises out of the wall in reading order.
    Flat, unlit twins of the same paths take over at the end, pixel-identical to the SVG.
  */
  type Letter = { group: THREE.Group; flat: THREE.Mesh; order: number };
  const letters: Letter[] = [];
  const letterGeometries: THREE.BufferGeometry[] = [];
  const letterMaterials: THREE.Material[] = [];
  const orangeMaterial = new THREE.MeshPhysicalMaterial({ color: '#C16042', roughness: 0.45, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  letterMaterials.push(orangeMaterial);
  const toModel = new THREE.Matrix4().makeScale(1 / SVG_UNIT, -1 / SVG_UNIT, -1 / SVG_UNIT)
    .premultiply(new THREE.Matrix4().makeTranslation(-SVG_ORIGIN.x / SVG_UNIT, SVG_ORIGIN.y / SVG_UNIT, 0));
  const buildLetters = (source: string) => {
    const data = new SVGLoader().parse(source);
    const parts: { shapes: THREE.Shape[]; fill: string; box: THREE.Box2; layer: number }[] = [];
    for (const [layer, path] of data.paths.entries()) {
      const fill = String(path.userData?.style?.fill ?? '').toLowerCase();
      const shapes = SVGLoader.createShapes(path);
      const box = new THREE.Box2();
      for (const shape of shapes) for (const point of shape.getPoints()) box.expandByPoint(point);
      // The symbol (tile, C, dot) is the 3D object already; keep only the name.
      if (box.min.x < 300 || !shapes.length) continue;
      parts.push({ shapes, fill, box, layer });
    }
    // Reading order: first line left → right, then the second line.
    parts.sort((a, b) => (Number(a.box.min.y > 150) - Number(b.box.min.y > 150)) || a.box.min.x - b.box.min.x);
    parts.forEach(({ shapes, fill, box, layer }, order) => {
      const depth = 24;
      const solid = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: 3, bevelSize: 1.2, bevelOffset: -1.2, bevelSegments: 3, curveSegments: compact ? 8 : 14 });
      const face = new THREE.ShapeGeometry(shapes, compact ? 8 : 14);
      // Pivot each letter on its own baseline centre so it can rise and turn in place.
      const centre = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, 0).applyMatrix4(toModel);
      for (const geometry of [solid, face]) {
        geometry.applyMatrix4(toModel);
        geometry.translate(-centre.x, -centre.y, 0);
      }
      // After the flip the extrusion runs from 0 to -depth: bring the front face into relief.
      // Overlapping paths (the orange arcs over the navy o's) keep the SVG's stacking order.
      solid.translate(0, 0, 0.12 + layer * 0.003);
      face.translate(0, 0, 0.158 + layer * 0.003);
      const lit = fill === '#c16042' ? orangeMaterial : tileMaterial;
      const flatMat = new THREE.MeshBasicMaterial({ color: fill || NAVY, toneMapped: false, transparent: true, opacity: 0, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(solid, lit);
      const flatMesh = new THREE.Mesh(face, flatMat);
      flatMesh.renderOrder = 2 + layer / 100;
      const group = new THREE.Group();
      group.position.copy(centre);
      group.add(mesh, flatMesh);
      group.visible = false;
      rig.add(group);
      letters.push({ group, flat: flatMesh, order });
      letterGeometries.push(solid, face);
      letterMaterials.push(flatMat);
    });
    letters.forEach(letter => { letter.group.visible = true; });
    renderer.compile(scene, camera);
    run();
  };
  fetch('/brand/logo.svg').then(response => response.text()).then(buildLetters).catch(() => undefined);

  // Soft contact shadow: one billboarded quad with a generated radial texture.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const context = shadowCanvas.getContext('2d')!;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(24,50,85,0.34)');
  gradient.addColorStop(0.55, 'rgba(24,50,85,0.1)');
  gradient.addColorStop(1, 'rgba(24,50,85,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
  const shadowGeometry = new THREE.PlaneGeometry(1, 1);
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
  scene.add(shadow);

  let landing: Landing | undefined;
  let target = 0;
  let progress = -1;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let width = 1;
  let height = 1;
  let visible = true;
  let frame = 0;
  let start = performance.now();
  let slowFrames = 0;
  let last = start;

  const resize = () => {
    width = host.clientWidth || 1;
    height = host.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const dockX = Math.cos(DOT_ANGLE) * DOT_DISTANCE;
  const dockY = Math.sin(DOT_ANGLE) * DOT_DISTANCE;

  const compose = (c: number, time: number) => {
    const aspect = width / height;
    const narrow = aspect < 1.2;
    const seconds = time / 1000;
    const intro = easeOut(clamp(time / 1800));
    // Concept
    const travel = ease(range(c, 0.16, 1.2));
    const breath = Math.sin(Math.PI * range(c, 0.8, 1.44));
    const open = ease(range(c, 1.2, 2.08));
    const lift = ease(range(c, 2.0, 2.6));
    const split = easeOut(range(c, 2.24, 2.88));
    const arrive = easeOut(range(c, 2.52, 3.2));
    const dock = Math.sin(Math.PI * range(c, 2.96, 3.36));
    // Finale
    const gather = ease(range(c, 3.25, 3.8));
    // One continuous turn of the whole piece reveals its depth; no spins.
    const turn = easeInOut(range(c, 3.25, 3.9));
    // The hub grows from the C's centre (first seen through the ring, then past it).
    const tileIn = easeOut(range(c, 3.42, 3.98));
    // Contrast inversion, timed to the hub's edge crossing the C's band (scale ≈ .46 → .66).
    const whiten = ease(range(c, 3.53, 3.6));
    // The C, held slightly forward, presses into the hub; the hub gives a little.
    const setIn = easeInOut(range(c, 3.84, 4.04));
    const give = Math.sin(Math.PI * range(c, 3.94, 4.14));
    const frame = easeInOut(range(c, 4.0, 4.32));
    const land = easeInOut(range(c, 4.5, 4.8));
    // Flat twins only once the object is square to the viewer: no ghosting.
    const flatten = ease(range(c, 4.6, 4.8));
    const still = 1 - land;

    // Seed → ring → C. The tube thins on a square-root curve so the spindle phase is brief.
    const { start: a0, end: a1, radius: r } = setTube(uniforms, open, split);
    capA.position.set(open * Math.cos(a0), open * Math.sin(a0), 0);
    capB.position.set(open * Math.cos(a1), open * Math.sin(a1), 0);
    capA.scale.setScalar(r);
    capB.scale.setScalar(r);

    // The meeting point glides in on a curve from above and behind the viewer.
    const u = 1 - arrive;
    dot.position.set(
      u * u * (dockX + 3.8) + 2 * u * arrive * (dockX + 1.6) + arrive * arrive * dockX,
      u * u * (dockY + 2.6) + 2 * u * arrive * (dockY - 0.9) + arrive * arrive * dockY,
      u * u * 4 + 2 * u * arrive * 1.4,
    );
    dot.scale.setScalar(DOT * mix(0.55, 1, arrive));
    dot.visible = arrive > 0.001;

    // Emblem orientation: lying ring → faces the viewer → answers the dock → one full turn.
    const drift = (1 - lift * 0.8) * (1 - gather);
    emblem.rotation.x = -1.1 * open * (1 - lift) + Math.sin(seconds * 0.5) * 0.03 * drift;
    emblem.rotation.y = 0.3 * open * (1 - lift) + Math.sin(seconds * 0.37 + 1) * 0.05 * drift;
    emblem.rotation.z = 0.7 * open * (1 - lift) - dock * 0.06;
    emblem.position.z = 0.5 * ease(range(c, 3.28, 3.45)) * (1 - setIn);
    const tone = navy.clone().lerp(offWhite, whiten);
    material.color.copy(tone);
    sphereMaterial.color.copy(tone);

    // The hub: grows from nothing at the C's centre, rising from slightly behind.
    tileRig.visible = tileIn > 0.001;
    tileMaterial.color.copy(navyDeep).lerp(navy, ease(tileIn));
    tileRig.position.z = mix(-1.2, 0, tileIn) - 0.07 * give;
    tileRig.rotation.set(0, 0, 0);
    tileRig.scale.setScalar(Math.max(0.001, tileIn));

    // Framing. Concept: 30vw → 16vw right on desktop, above the text on narrow screens.
    const unitsPerVw = aspect * VIEW_HEIGHT / 100;
    const conceptX = narrow ? 0 : mix(30, 16, travel) * unitsPerVw;
    const conceptY = narrow ? mix(1.3, 0.98, travel) : -0.05;
    const base = narrow ? (width < 700 ? 0.52 : 0.7) : 1;
    const conceptScale = base * mix(0.9, 1, intro) * (1 + breath * 0.04) * mix(1, 1.12, open);
    // Finale: centre stage, presented at a slight angle, then face-on on the lockup symbol.
    const pxPerUnit = height / VIEW_HEIGHT;
    const stageScale = narrow ? 0.46 : 0.62;
    // Pull back to frame the whole lockup, a little larger than where it will land.
    const frameScale = (narrow ? 0.88 : 0.58) * aspect * VIEW_HEIGHT / LOCKUP_WIDTH;
    const frameX = -LOCKUP_CENTRE.x * frameScale;
    const frameY = (narrow ? 0.3 : 0.25) - LOCKUP_CENTRE.y * frameScale;
    const landX = landing ? (landing.x - width / 2) / pxPerUnit : 0;
    const landY = landing ? (height / 2 - landing.y) / pxPerUnit : 0.35;
    const landScale = landing ? landing.radius / pxPerUnit : 0.3;
    const x = mix(mix(mix(conceptX, 0, gather), frameX, frame), landX, land);
    const y = mix(mix(mix(conceptY, narrow ? 0.5 : 0.2, gather), frameY, frame), landY, land);
    const scale = mix(mix(mix(conceptScale, stageScale, gather), frameScale, frame), landScale, land);
    const float = Math.sin(seconds * 0.9) * 0.06 * (1 - lift) + Math.sin(seconds * 0.8) * 0.04 * tileIn * still;
    rig.position.set(x, y + float - (1 - intro) * 0.25, 0);
    rig.scale.setScalar(scale);
    const present = turn * still;
    const hand = still * (1 - flatten);
    // Presented like a sign seen from the side, then squared up to the viewer.
    rig.rotation.set(mix(0.16, 0.1, frame) * present + pointer.y * 0.12 * hand, mix(-0.42, -0.24, frame) * present + pointer.x * 0.18 * hand, 0);

    // Letters rise out of the wall in reading order: from depth, turning up on their baseline.
    const count = Math.max(1, letters.length);
    for (const letter of letters) {
      const begin = 4.16 + (letter.order / count) * 0.3;
      const t = easeOut(range(c, begin, begin + 0.2));
      letter.group.visible = t > 0.001;
      letter.group.position.z = mix(-1.2, 0, t);
      letter.group.rotation.x = mix(-1.35, 0, t);
      letter.group.scale.setScalar(mix(0.7, 1, t));
      (letter.flat.material as THREE.MeshBasicMaterial).opacity = flatten;
      letter.flat.visible = flatten > 0.001;
    }
    orangeMaterial.envMapIntensity = mix(1, 0.4, land);

    // As it lands face-on, the light softens so the lit navy converges on the flat #183255.
    // Face-on, direct light washes navy toward slate: the lamps dim as it lands, the soft
    // room reflections stay, and the lit navy converges on the flat #183255.
    key.intensity = mix(1.5, 0.2, land);
    bounce.intensity = mix(0.3, 0, land);
    rim.intensity = mix(0.7, 0, land);
    tileMaterial.envMapIntensity = mix(mix(0.55, 0.9, tileIn), 0.4, land);

    // Flat twins take over for the last instant; the SVG underneath is pixel-identical.
    flatMaterial.opacity = flatten;
    flatSphereMaterial.opacity = flatten;
    flatTileMaterial.opacity = flatten;
    const showFlat = flatten > 0.001;
    flatSurface.visible = showFlat;
    flatTile.visible = showFlat;
    [capA, capB, dot].forEach((part, index) => {
      flatParts[index].visible = showFlat && part.visible;
      flatParts[index].position.copy(part.position);
      flatParts[index].scale.copy(part.scale);
    });

    const spread = mix(mix(mix(2.6, 3.6, open), 4.6, tileIn), LOCKUP_WIDTH * 1.1, frame) * scale;
    const shadowX = x + LOCKUP_CENTRE.x * scale * frame;
    shadow.position.set(shadowX, y - mix(1.3, 2.2, tileIn) * scale - float * 0.5, -0.4);
    shadow.scale.set(spread * (1 - float * 0.8), spread * 0.16, 1);
    shadowMaterial.opacity = intro * mix(1, 0.5, lift) * (1 - gather) + tileIn * still * 0.8;
  };

  const tick = (now: number) => {
    frame = 0;
    if (!visible) return;
    const delta = Math.min(now - last, 100);
    last = now;
    // Sustained slow frames lower resolution once instead of dropping the frame rate.
    if (delta > 28 && delta < 100) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 40 && dpr > 1) { dpr = 1; renderer.setPixelRatio(dpr); resize(); slowFrames = 0; }

    // Frame-rate independent damping: the same glide at 30, 60 or 120 fps.
    const follow = 1 - Math.exp(-delta / 1000 * 5.5);
    const hand = 1 - Math.exp(-delta / 1000 * 3);
    progress = progress < 0 ? target : progress + (target - progress) * follow;
    pointer.x += (pointer.tx - pointer.x) * hand;
    pointer.y += (pointer.ty - pointer.y) * hand;
    compose(progress, now - start);
    renderer.render(scene, camera);
    // The HTML half of the handover follows this damped clock, never the raw scroll.
    onFrame?.(progress);
    frame = requestAnimationFrame(tick);
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
  const onVisibility = () => { visible = document.visibilityState === 'visible'; if (visible) run(); else stop(); };
  document.addEventListener('visibilitychange', onVisibility);
  const onLost = (event: Event) => { event.preventDefault(); stop(); host.dataset.ready = 'false'; };
  renderer.domElement.addEventListener('webglcontextlost', onLost);

  resize();
  compose(0, 0);
  // Compile every program up front (tile and flat twins included) so nothing hitches mid-scroll.
  tileRig.visible = flatSurface.visible = flatTile.visible = true;
  renderer.compile(scene, camera);
  compose(0, 0);
  renderer.render(scene, camera);
  host.dataset.ready = 'true';
  start = performance.now();
  run();

  return {
    setProgress: value => { target = clamp(value, 0, CHAPTERS); run(); },
    setLanding: value => { landing = value; },
    setPointer: (x, y) => { pointer.tx = x; pointer.ty = y; },
    dispose: () => {
      stop();
      resizeObserver.disconnect();
      viewObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      for (const geometry of [surfaceGeometry, sphereGeometry, tileGeometry, flatTileGeometry, shadowGeometry, ...letterGeometries]) geometry.dispose();
      for (const m of letterMaterials) m.dispose();
      for (const m of [material, sphereMaterial, tileMaterial, flatMaterial, flatSphereMaterial, flatTileMaterial, shadowMaterial]) m.dispose();
      shadowTexture.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      delete host.dataset.ready;
    },
  };
}
