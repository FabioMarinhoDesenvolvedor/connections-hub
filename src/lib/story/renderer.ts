import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { SYMBOL } from './geometry';
import { ARCS, CARD, C_PATH, C_UNIT, MARK, type ArcColour, type OrbitState } from './orbits';
import type { Placement } from './timeline';

/*
  Real-time render of "Orbits" (orbits.ts): thin cards extruded from the brand's own outlines,
  a matte card material, image-based light from a small purpose-built studio, and one soft
  shadow-casting key onto the page. No post-processing: the cards' depth reads through cast
  shadow, and ambient occlusion was measured to add nothing visible here.

  Draws only when asked (scroll or pointer changed), at an internal resolution that adapts to
  the device and steps down on sustained GPU overrun.
*/
/**
  adapt: false for frames that should not steer the adaptive resolution (hand play).
  seedColour: the seed's face while it is being played with; absent, the theme's own.
*/
export type Frame = { placement: Placement; state: OrbitState; visible: boolean; adapt?: boolean; seedColour?: string };
export type StoryRenderer = {
  draw: (frame: Frame) => void;
  resize: (width: number, height: number) => void;
  setTheme: (dark: boolean) => void;
  dispose: () => void;
  readonly stats: { frames: number; scale: number; gpu: number };
};
type Options = { compact: boolean; dark: boolean; onLost: () => void };

export function supportsWebGL2() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
  } catch { return false; }
}

/** What the page is drawing with, for the developer console. Reads the live context. */
export function describe(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2');
  let gpu = 'unknown';
  if (gl) {
    try {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      gpu = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    } catch { gpu = String(gl.getParameter(gl.RENDERER)); }
  }
  return { api: 'WebGL2', gpu, three: `r${THREE.REVISION}` };
}

const COLOURS: Record<ArcColour, string> ={ navy: '#183255', orange: '#C16042', sand: '#E8D8C5', paper: '#F8F6F0' };
/*
  On the dark page (ink) the object keeps the brand palette but swaps what would disappear
  into the ground: navy parts become mist, the seed becomes sand, and the hub opens as the
  orange tile of logo-light.svg, the official file the hand-off lands on in that theme.
*/
const DARK: Partial<Record<ArcColour, string>> = { navy: '#CCD6DB' };
const palette = (dark: boolean) => ({
  arc: (colour: ArcColour) => (dark && DARK[colour]) || COLOURS[colour],
  seed: dark ? COLOURS.sand : COLOURS.navy,
  tile: dark ? COLOURS.orange : COLOURS.navy,
  shadow: dark ? { color: '#000000', opacity: 0.42 } : { color: '#0F3199', opacity: 0.16 },
});
// Flat states divide by the exposure so the last 3D frame lands on the brand colours exactly.
const EXPOSURE = 1.42;
const FOV = 16; // long lens: product-photography compression, almost no perspective drift
const DISTANCE = 30;

/** Extruded with the bevel inside the outline, so the frontal silhouette equals the outline. */
function extrude(shapes: THREE.Shape | THREE.Shape[], depth: number, bevel = 0.008) {
  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth, steps: 1, curveSegments: 1,
    bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 4,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

const rad = (degrees: number) => degrees * Math.PI / 180;

/** Annular sector with round ends; a zero sweep gives a disc of radius `half`. */
function capsuleArc(radius: number, half: number, from: number, to: number) {
  const points: THREE.Vector2[] = [];
  const a0 = rad(from), a1 = rad(to);
  const n = Math.max(2, Math.round(120 * Math.abs(a1 - a0) / (2 * Math.PI)));
  const at = (r: number, a: number) => new THREE.Vector2(MARK.centre.x + r * Math.cos(a), MARK.centre.y + r * Math.sin(a));
  const cap = (centre: THREE.Vector2, start: number) => {
    for (let i = 1; i < 48; i++) { const f = start + Math.PI * i / 48; points.push(new THREE.Vector2(centre.x + half * Math.cos(f), centre.y + half * Math.sin(f))); }
  };
  for (let i = 0; i <= n; i++) points.push(at(radius + half, a0 + (a1 - a0) * i / n));
  cap(at(radius, a1), a1);
  for (let i = 0; i <= n; i++) points.push(at(radius - half, a1 + (a0 - a1) * i / n));
  cap(at(radius, a0), a0 + Math.PI);
  return new THREE.Shape(points);
}

function roundedSquare(cx: number, cy: number, half: number, corner: number) {
  const r = Math.min(corner, half), s = half - r, points: THREE.Vector2[] = [];
  for (const [x, y, start] of [[s, s, 0], [-s, s, 90], [-s, -s, 180], [s, -s, 270]]) {
    for (let i = 0; i <= 28; i++) { const a = rad(start + 90 * i / 28); points.push(new THREE.Vector2(cx + x + r * Math.cos(a), cy + y + r * Math.sin(a))); }
  }
  return new THREE.Shape(points);
}

function disc(r: number) {
  const points: THREE.Vector2[] = [];
  for (let i = 0; i < 160; i++) { const a = 2 * Math.PI * i / 160; points.push(new THREE.Vector2(r * Math.cos(a), r * Math.sin(a))); }
  return new THREE.Shape(points);
}

/** The official C, from its own path data, mapped into symbol units (y up). */
function officialC() {
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${C_PATH}"/></svg>`);
  return data.paths.flatMap(path => SVGLoader.createShapes(path)).map(shape => {
    const map = (points: THREE.Vector2[]) => points.map(p => new THREE.Vector2((p.x - C_UNIT) / C_UNIT, -(p.y - C_UNIT) / C_UNIT));
    const mapped = new THREE.Shape(map(shape.getPoints(64)));
    mapped.holes = shape.holes.map(hole => new THREE.Path(map(hole.getPoints(64))));
    return mapped;
  });
}

/*
  Image-based light. Matte card only shows a light's shape as broad falloff, so the room is
  simple: one large softbox high on the left, a warm bounce from the paper below, a weak fill,
  a thin rim strip, dark elsewhere.
*/
function studio() {
  const room = new THREE.Scene();
  room.background = new THREE.Color(0.035, 0.035, 0.04);
  const panel = (w: number, h: number, [x, y, z]: number[], colour: string, power: number) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(power), side: THREE.DoubleSide }));
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    room.add(mesh);
  };
  panel(7, 7, [-5, 6, 6], '#ffffff', 5.5);
  panel(14, 4, [0, -6, 3], '#F8F1E6', 0.9);
  panel(4, 9, [7, 1, 4], '#EEF2F8', 0.9);
  panel(10, 2, [0, 7, -4], '#ffffff', 1.2);
  return room;
}

/** Matte card. uFlat blends lit colour to the exact flat colour for the hand-off. */
function card(colour: string, flat: { value: number }, sheen = 0.2) {
  const material = new THREE.MeshPhysicalMaterial({
    color: colour, roughness: 0.86, metalness: 0, sheen, sheenRoughness: 0.9, sheenColor: 0xffffff, specularIntensity: 0.2,
  });
  material.onBeforeCompile = shader => {
    shader.uniforms.uFlat = flat;
    shader.fragmentShader = 'uniform float uFlat;\n' + shader.fragmentShader.replace('#include <opaque_fragment>',
      `outgoingLight = mix(outgoingLight, diffuseColor.rgb / ${EXPOSURE.toFixed(4)}, uFlat);\n#include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => 'story-card';
  return material;
}

/** Lets the browser handle input and paint between setup steps. */
const yieldToBrowser = () => new Promise<void>(resolve => setTimeout(resolve, 0));

export async function createStoryRenderer(canvas: HTMLCanvasElement, { compact, dark, onLost }: Options): Promise<StoryRenderer> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'default' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps brand hues, no filmic desaturation
  renderer.toneMappingExposure = EXPOSURE;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  const gl = renderer.getContext() as WebGL2RenderingContext;

  await yieldToBrowser();
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = studio();
  const environment = pmrem.fromScene(room, 0).texture;
  scene.environment = environment;
  room.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); object.material.dispose(); } });
  pmrem.dispose();

  await yieldToBrowser();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  camera.position.set(0, 0, DISTANCE);

  // Key: high and to the left, low enough that card edges throw readable shadows.
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.castShadow = true;
  const mapSize = compact ? 1024 : 2048;
  key.shadow.mapSize.set(mapSize, mapSize);
  key.shadow.radius = compact ? 11 : 22;
  key.shadow.blurSamples = compact ? 12 : 24;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.01;
  scene.add(key, key.target);

  // The page receives the shadow; its colour stays CSS, never lighting. The shadow is a cool
  // navy-blue glaze (the approved prototype's look), composited outside tone mapping.
  const page = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ color: '#0F3199', opacity: 0.16, transparent: true, toneMapped: false }));
  let shadowOpacity = 0.16;
  page.receiveShadow = true;
  scene.add(page);

  const holder = new THREE.Group(); // placement on screen
  const group = new THREE.Group();  // the object, in symbol units
  holder.add(group);
  scene.add(holder);

  const flat = { value: 0 };
  const meshes: THREE.Mesh[] = [];
  const mesh = (colour: string, parent: THREE.Object3D, sheen?: number) => {
    const m = new THREE.Mesh(undefined, card(colour, flat, sheen));
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    meshes.push(m);
    return m;
  };
  // Two-sided card: brand colour on the face, paper on the back; a pivot turns it over.
  const twoSided = (colour: string) => {
    const pivot = new THREE.Group();
    group.add(pivot);
    const face = mesh(colour, pivot), back = mesh(COLOURS.paper, pivot);
    face.position.z = CARD / 2 + 0.002;
    back.position.z = -CARD / 2 - 0.002;
    return { pivot, face, back, key: '' };
  };
  const arcs = ARCS.map(a => twoSided(COLOURS[a.colour]));
  const seed = twoSided(COLOURS.navy);
  const tile = mesh(COLOURS.navy, group, 0);
  const c = mesh(COLOURS.paper, group);
  await yieldToBrowser();
  c.geometry = extrude(officialC(), CARD);
  c.position.z = CARD + 0.002;
  let tileKey = '';
  let seedDefault = COLOURS.navy, seedShown = '';
  const setTheme = (isDark: boolean) => {
    const colours = palette(isDark);
    const tint = (m: THREE.Mesh, colour: string) => (m.material as THREE.MeshPhysicalMaterial).color.set(colour);
    arcs.forEach((side, i) => tint(side.face, colours.arc(ARCS[i].colour)));
    seedDefault = colours.seed;
    seedShown = '';
    tint(tile, colours.tile);
    page.material.color.set(colours.shadow.color);
    shadowOpacity = colours.shadow.opacity;
  };
  setTheme(dark);
  const axis = new THREE.Vector3();
  const reshape = (side: { face: THREE.Mesh; back: THREE.Mesh; key: string }, key: string, build: () => THREE.BufferGeometry) => {
    if (side.key === key) return;
    side.face.geometry.dispose();
    side.face.geometry = side.back.geometry = build();
    side.key = key;
  };

  // Internal resolution: device pixels × quality, under a pixel budget. Quality only ever
  // steps down, driven by measured GPU time where the browser exposes it.
  const maxRatio = compact ? 1.5 : 1.75;
  const pixelBudget = compact ? 1.4e6 : 3.2e6;
  let quality = 1;
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2') as { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;
  let query: WebGLQuery | null = null;
  let gpuAverage = 0, gpuSamples = 0, gpuOver = 0, last = 0, slow = 0;
  let cssWidth = 1, cssHeight = 1, pxPerUnit = 1;
  let lost = false;
  const stats = { frames: 0, scale: 1, gpu: 0 };

  const resize = (width: number, height: number) => {
    cssWidth = Math.max(1, width);
    cssHeight = Math.max(1, height);
    const ratio = Math.min(window.devicePixelRatio || 1, maxRatio, Math.sqrt(pixelBudget / (cssWidth * cssHeight))) * quality;
    renderer.setPixelRatio(ratio);
    renderer.setSize(cssWidth, cssHeight, false);
    camera.aspect = cssWidth / cssHeight;
    camera.updateProjectionMatrix();
    pxPerUnit = (cssHeight / 2) / (DISTANCE * Math.tan(rad(FOV / 2)));
    stats.scale = ratio;
  };

  const pose = (frame: Frame) => {
    const { placement, state } = frame;
    // Screen placement: centre in px, scale in px per world unit (tile half = SYMBOL.tileHalf).
    const half = placement.scale * SYMBOL.tileHalf / pxPerUnit;
    holder.position.set((placement.x - cssWidth / 2) / pxPerUnit, -(placement.y - cssHeight / 2) / pxPerUnit, 0);
    holder.scale.setScalar(half);
    key.position.set(holder.position.x - 4.5 * half, holder.position.y + 4.5 * half, 10 * half);
    key.target.position.copy(holder.position);
    const s = 2.4 * half;
    Object.assign(key.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.1, far: 40 * half });
    key.shadow.camera.updateProjectionMatrix();
    page.position.z = -0.3 * half;
    page.material.opacity = shadowOpacity * (1 - state.flat);

    state.arcs.forEach((a, i) => {
      const side = arcs[i];
      reshape(side, `${a.from.toFixed(2)}|${a.to.toFixed(2)}|${a.radius.toFixed(4)}|${a.half.toFixed(4)}`,
        () => extrude(capsuleArc(a.radius, Math.max(a.half, 0.002), a.from, a.to), CARD, Math.min(0.008, a.half * 0.4)));
      side.pivot.visible = a.visible;
      const mid = rad((a.from + a.to) / 2);
      axis.set(Math.cos(mid), Math.sin(mid), 0);
      side.pivot.quaternion.setFromAxisAngle(axis, Math.PI * a.turn);
      side.pivot.position.set(0, 0, a.z);
    });
    c.visible = state.fused;

    const face = frame.seedColour ?? seedDefault;
    if (face !== seedShown) { (seed.face.material as THREE.MeshPhysicalMaterial).color.set(face); seedShown = face; }
    reshape(seed, state.seed.r.toFixed(4), () => extrude(disc(state.seed.r), CARD));
    seed.pivot.position.set(state.seed.x, state.seed.y, state.seed.z);
    seed.pivot.rotation.y = Math.PI * state.seed.turn;

    const t = state.tile;
    const nextTile = `${t.half.toFixed(4)}|${t.corner.toFixed(4)}|${t.x.toFixed(4)}`;
    if (nextTile !== tileKey) { tile.geometry.dispose(); tile.geometry = extrude(roundedSquare(t.x, t.y, t.half, t.corner), CARD * 1.6); tileKey = nextTile; }
    tile.visible = t.visible;
    tile.position.z = -CARD * 0.8;

    flat.value = state.flat;
    group.rotation.set(state.pitch, state.yaw, 0);
    group.scale.z = 1 - 0.98 * state.flat;
  };

  const draw = (frame: Frame) => {
    if (lost) return;
    const measuring = frame.adapt !== false;
    if (!measuring) last = 0;
    const stepDown = () => { if (quality > 0.55) { quality *= 0.85; resize(cssWidth, cssHeight); } };
    if (timer && query) {
      // Read the previous frame's GPU time once it is ready; never block waiting for it.
      if (gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
        const disjoint = gl.getParameter(timer.GPU_DISJOINT_EXT);
        const ms = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6;
        gl.deleteQuery(query); query = null;
        if (!disjoint && measuring && ++gpuSamples > 6) {
          gpuAverage = gpuAverage ? gpuAverage * 0.85 + ms * 0.15 : ms;
          stats.gpu = Math.round(gpuAverage * 10) / 10;
          gpuOver = gpuAverage > 10 ? gpuOver + 1 : 0;
          if (gpuOver > 15) { stepDown(); gpuOver = 0; gpuAverage = 0; gpuSamples = 0; }
        }
      }
    } else if (!timer && measuring) {
      // Fallback: consecutive frames slower than ~45 fps suggest a GPU-bound page.
      const now = performance.now();
      if (last && now - last < 60) {
        slow = now - last > 22 ? slow + 1 : Math.max(0, slow - 1);
        if (slow > 12) { stepDown(); slow = 0; }
      }
      last = now;
    }
    if (!frame.visible) { renderer.clear(); return; }
    pose(frame);
    const timing = timer && !query ? gl.createQuery() : null;
    if (timing && timer) gl.beginQuery(timer.TIME_ELAPSED_EXT, timing);
    renderer.render(scene, camera);
    if (timing && timer) { gl.endQuery(timer.TIME_ELAPSED_EXT); query = timing; }
    stats.frames++;
  };

  // Compile every program up front (hidden cards included), so no state change stalls a frame.
  resize(canvas.clientWidth || 1, canvas.clientHeight || 1);
  for (const side of [...arcs, seed]) side.face.geometry = side.back.geometry = extrude(disc(0.1), CARD);
  tile.geometry = extrude(disc(0.1), CARD);
  await yieldToBrowser();
  await renderer.compileAsync(scene, camera);

  const handleLost = (event: Event) => { event.preventDefault(); lost = true; onLost(); };
  canvas.addEventListener('webglcontextlost', handleLost);

  return {
    draw,
    resize,
    setTheme,
    stats,
    dispose: () => {
      canvas.removeEventListener('webglcontextlost', handleLost);
      if (query && !gl.isContextLost()) gl.deleteQuery(query);
      for (const m of meshes) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
      page.geometry.dispose();
      page.material.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
