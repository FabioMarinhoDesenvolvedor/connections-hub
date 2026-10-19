import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

/*
  The official symbol as a physical object, rendered in real time.

  Geometry comes straight from public/brand/symbol-navy.svg (the rounded tile, the C and the
  dot), so the silhouette is the brand's own. The tile is a thick slab with a rounded edge
  that catches the studio's strip lights; the C and the dot are raised inlays. The finish is
  satin: soft broad highlights, crisp reflections only on the rounded edges.

  A click is a drop of ink on the object itself: from the point it lands, the next official
  colourway of the symbol spreads over the tile and the mark with a wavering edge, flung
  droplets and a darker, glossier wet rim. The page's theme is not touched.

  Light: an image-based studio (a large softbox, two tall strip lights for the rims, a warm
  bounce from below) plus one soft key that throws the tile's shadow onto the page behind it.
  Draws only when asked.
*/

export type Pose = {
  /** Rotation about the vertical axis, radians (0 = facing the reader). */
  spin: number;
  /** Extra lean, radians. */
  tilt: { x: number; y: number };
  /** Vertical offset, in tile half-sizes. */
  lift: number;
  /** Overall scale (1 = resting size). */
  scale: number;
  /** The dot seating into place, 0..1 (overshoot allowed). */
  dot: number;
  /** Studio rotation, radians: moves the highlights across the surfaces. */
  sweep: number;
  /** Free rotation from the reader's hands, applied in screen axes, as [x, y, z, w]. */
  orient?: [number, number, number, number];
};

export type Placement = { x: number; y: number; half: number };

export type LogoRenderer = {
  draw: (placement: Placement, pose: Pose) => void;
  /** A drop of ink at (x, y) in canvas pixels; returns where it landed on the symbol (tile half-sizes), or null. */
  splash: (x: number, y: number) => { x: number; y: number } | null;
  /** True while ink is still spreading (the caller keeps drawing). */
  readonly inking: boolean;
  resize: (width: number, height: number) => void;
  setTheme: (dark: boolean) => void;
  dispose: () => void;
  readonly stats: { frames: number; ratio: number };
};

const NAVY = '#183255', ORANGE = '#C16042', PAPER = '#F8F6F0';
/** The symbol's official colourways: symbol-navy, logo-light, symbol-light, logo. */
const COLOURWAYS = [
  { tile: NAVY, mark: ORANGE, sheen: '#9FB2CC' },
  { tile: ORANGE, mark: PAPER, sheen: '#F2C7B4' },
  { tile: PAPER, mark: NAVY, sheen: '#FFFFFF' },
  { tile: NAVY, mark: PAPER, sheen: '#9FB2CC' },
] as const;
const INK_TIME = 1700; // ms for the ink to cover the whole object
const DROPS = 11;
const DRIPS = 3;

/*
  Shader addition shared by the tile and the mark: liquid in the object's own space, so it
  turns with the object.
    stain     spreads from the impact with a noisy edge, further downwards than upwards
              (gravity), with a few runs dripping down from it;
    droplets  flung by the impact, stretched away from it;
    surface   the ink has a little body: a raised meniscus at its front that catches the
              studio lights, a ripple running ahead of it, and a wet gloss that dries back to
              satin behind the front. Height becomes a bent normal (screen-space bump).
*/
const INK_VERTEX = `
uniform mat4 uInkMatrix;
varying vec3 vInkPos;`;
const INK_FRAGMENT = `
uniform vec3 uInkCentre;
uniform float uInkRadius;
uniform vec4 uDrops[${DROPS}];
uniform float uDropGrow;
uniform vec4 uDrips[${DRIPS}];
uniform float uDripGrow;
uniform float uRipple;
uniform float uInkBumpScale;
uniform float uInkSeed;
uniform vec3 uInkColour;
varying vec3 vInkPos;
vec3 inkBump(vec3 pos, vec3 n, float h) {
  vec3 dpx = dFdx(pos), dpy = dFdy(pos);
  vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec2 dh = vec2(dFdx(h), dFdy(h)) * uInkBumpScale;
  vec3 grad = sign(det) * (dh.x * r1 + dh.y * r2);
  return normalize(abs(det) * n - grad);
}
float inkHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float inkNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(inkHash(i), inkHash(i + vec2(1.0, 0.0)), u.x), mix(inkHash(i + vec2(0.0, 1.0)), inkHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float inkFbm(vec2 p) { return 0.62 * inkNoise(p) + 0.29 * inkNoise(p * 2.3 + 7.1) + 0.09 * inkNoise(p * 4.7 + 3.7); }`;
const INK_APPLY = `
float inkM = 0.0, inkRim = 0.0, inkH = 0.0, inkWet = 0.0;
if (uInkRadius > 0.0) {
  vec2 inkV = vInkPos.xy - uInkCentre.xy;
  float inkN = inkFbm(vInkPos.xy * 3.4 + uInkSeed) - 0.5;
  vec2 inkG = vec2(inkV.x, inkV.y * (inkV.y < 0.0 ? 0.74 : 1.1));
  float inkD = length(inkG) + max(0.0, uInkCentre.z - vInkPos.z) * 0.6;
  for (int i = 0; i < ${DRIPS}; i++) {
    vec4 drip = uDrips[i];
    float across = (inkV.x - drip.x) / drip.y;
    inkD -= drip.z * uDripGrow * exp(-across * across) * smoothstep(0.0, 0.3, -inkV.y);
  }
  float inkE = inkD + inkN * 0.17;
  float stain = 1.0 - smoothstep(uInkRadius - 0.022, uInkRadius + 0.006, inkE);
  inkM = stain;
  inkRim = stain * smoothstep(uInkRadius - 0.11, uInkRadius - 0.008, inkE);
  inkWet = stain * (1.0 - smoothstep(0.0, 0.8, uInkRadius - inkE));
  float ahead = inkE - uInkRadius;
  inkH = stain * 0.005 + inkRim * inkRim * 0.011 + uRipple * sin(ahead * 40.0) * exp(-max(ahead, 0.0) * 6.0) * smoothstep(0.0, 0.03, ahead) * 0.0022;
  for (int i = 0; i < ${DROPS}; i++) {
    vec4 drop = uDrops[i];
    vec2 dir = normalize(drop.xy);
    vec2 p = inkV - drop.xy;
    float dd = length(vec2(dot(p, dir) / (1.0 + drop.w), dot(p, vec2(-dir.y, dir.x)))) + inkN * 0.03;
    float r = drop.z * uDropGrow;
    float m = 1.0 - smoothstep(r - 0.012, r + 0.003, dd);
    // once the stain reaches a droplet, the droplet is simply part of it: no ring left behind
    float own = m * (1.0 - stain);
    float rim = own * smoothstep(r - 0.035, r, dd);
    inkM = max(inkM, m);
    inkRim = max(inkRim, rim);
    inkWet = max(inkWet, own);
    inkH = max(inkH, own * 0.005 + rim * rim * 0.009);
  }
  diffuseColor.rgb = mix(diffuseColor.rgb, uInkColour, inkM);
  diffuseColor.rgb *= 1.0 - 0.16 * inkRim;
}`;
const INK_NORMAL = `
normal = inkBump(-vViewPosition, normal, inkH);`;
const INK_CLEARCOAT = `
#ifdef USE_CLEARCOAT
clearcoatNormal = inkBump(-vViewPosition, clearcoatNormal, inkH);
#endif`;
const FOV = 20;
const DISTANCE = 30;
const SLAB = 0.2;     // tile thickness before the rounded edge, in tile half-sizes
const EDGE = 0.1;     // radius of the rounded edge
const INLAY = 0.045;  // relief of the C and the dot

export function supportsWebGL2() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
  } catch { return false; }
}

/** A photographic studio as an environment map: shape of light, not colour, is what shows. */
function studio(renderer: THREE.WebGLRenderer) {
  const room = new THREE.Scene();
  room.background = new THREE.Color(0.02, 0.022, 0.026);
  const panel = (w: number, h: number, at: [number, number, number], colour: string, power: number) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(power), side: THREE.DoubleSide }));
    mesh.position.set(...at);
    mesh.lookAt(0, 0, 0);
    room.add(mesh);
  };
  panel(7, 5, [-5, 4.5, 6], '#FFFFFF', 6);      // key softbox, high left
  panel(0.8, 10, [-7, 0.5, 1.5], '#FFFFFF', 12); // left strip: a crisp line down the left edges
  panel(0.8, 10, [7, 0.5, 1], '#EEF2F8', 9);     // right strip
  panel(10, 0.7, [0, 7, 1.5], '#FFFFFF', 7);     // top strip: the line along the top edge
  panel(14, 4, [0, -6, 4], '#F3E6D6', 1.4);      // warm bounce from the paper
  panel(6, 5, [3, 0, 9], '#FFFFFF', 1.6);        // front fill: keeps the faces in brand colour
  const pmrem = new THREE.PMREMGenerator(renderer);
  const map = pmrem.fromScene(room, 0.02).texture;
  room.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
  pmrem.dispose();
  return map;
}

/** The symbol's three shapes, in tile half-sizes (origin at the tile centre, y up). */
async function symbolShapes() {
  const source = await (await fetch('/brand/symbol-navy.svg')).text();
  const data = new SVGLoader().parse(source);
  const half = 632.23 / 2;
  const map = (points: THREE.Vector2[]) => points.map(p => new THREE.Vector2((p.x - half) / half, -(p.y - half) / half));
  const toShape = (shape: THREE.Shape) => {
    const out = new THREE.Shape(map(shape.getPoints(96)));
    out.holes = shape.holes.map(hole => new THREE.Path(map(hole.getPoints(96))));
    return out;
  };
  const found: { tile?: THREE.Shape[]; c?: THREE.Shape[]; dot?: THREE.Shape[] } = {};
  for (const path of data.paths) {
    const node = path.userData?.node as Element | undefined;
    const shapes = SVGLoader.createShapes(path).map(toShape);
    if (node?.nodeName === 'rect') found.tile = shapes;
    else if (node?.nodeName === 'circle') found.dot = shapes;
    else found.c = shapes;
  }
  if (!found.tile || !found.c || !found.dot) throw new Error('symbol-navy.svg: unexpected structure');
  return found as Required<typeof found>;
}

/** Extruded with the edge rounded inward, so the front silhouette equals the outline. */
function slab(shapes: THREE.Shape[], depth: number, edge: number, segments: number) {
  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth, steps: 1, curveSegments: 64,
    bevelEnabled: true, bevelThickness: edge, bevelSize: edge, bevelOffset: -edge, bevelSegments: segments,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

export async function createLogoRenderer(canvas: HTMLCanvasElement, options: { dark: boolean; compact: boolean; onLost: () => void }): Promise<LogoRenderer> {
  const shapes = await symbolShapes();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps the brand hues
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  const environment = studio(renderer);
  scene.environment = environment;

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  camera.position.set(0, 0, DISTANCE);

  // The key that draws the shadow on the page: high, left, a little in front.
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.castShadow = true;
  const mapSize = options.compact ? 1024 : 2048;
  key.shadow.mapSize.set(mapSize, mapSize);
  key.shadow.radius = options.compact ? 10 : 18;
  key.shadow.blurSamples = options.compact ? 12 : 20;
  key.shadow.bias = -0.0005;
  scene.add(key, key.target);

  const page = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ color: NAVY, opacity: 0.2, transparent: true, toneMapped: false }));
  page.receiveShadow = true;
  scene.add(page);

  const handTurn = new THREE.Quaternion();
  const holder = new THREE.Group(); // screen placement and size
  const object = new THREE.Group(); // the symbol, in tile half-sizes
  holder.add(object);
  scene.add(holder);

  // Lacquered: a soft satin body under a thin glossy coat, so faces stay in brand colour
  // while the rounded edges draw the studio's strip lights as clean lines.
  const tileMaterial = new THREE.MeshPhysicalMaterial({
    color: NAVY, roughness: 0.55, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.09,
    sheen: 0.25, sheenRoughness: 0.5, sheenColor: new THREE.Color('#9FB2CC'), specularIntensity: 0.5,
  });
  const markMaterial = new THREE.MeshPhysicalMaterial({
    color: ORANGE, roughness: 0.45, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.07, specularIntensity: 0.6,
  });

  // Ink: shared uniforms, one target colour per material.
  const ink = {
    uInkMatrix: { value: new THREE.Matrix4() },
    uInkCentre: { value: new THREE.Vector3() },
    uInkRadius: { value: -1 },
    uDrops: { value: Array.from({ length: DROPS }, () => new THREE.Vector4()) },
    uDropGrow: { value: 0 },
    uDrips: { value: Array.from({ length: DRIPS }, () => new THREE.Vector4(0, 1, 0, 0)) },
    uDripGrow: { value: 0 },
    uRipple: { value: 0 },
    uInkBumpScale: { value: 1 },
    uInkSeed: { value: 0 },
  };
  const inkable = (material: THREE.MeshPhysicalMaterial, key: string) => {
    const colour = { value: new THREE.Color() };
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, ink, { uInkColour: colour });
      shader.vertexShader = INK_VERTEX + '\n' + shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvInkPos = (uInkMatrix * modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = INK_FRAGMENT + '\n' + shader.fragmentShader
        .replace('#include <color_fragment>', '#include <color_fragment>' + INK_APPLY)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.1, max(inkRim, inkWet * 0.85));')
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>' + INK_NORMAL)
        .replace('#include <clearcoat_normal_fragment_maps>', '#include <clearcoat_normal_fragment_maps>' + INK_CLEARCOAT);
    };
    material.customProgramCacheKey = () => key;
    return colour;
  };
  const tileInk = inkable(tileMaterial, 'logo-tile-ink');
  const markInk = inkable(markMaterial, 'logo-mark-ink');
  let colourway = 0, inkStart = -1, inkTarget = 0;

  const tile = new THREE.Mesh(slab(shapes.tile, SLAB, EDGE, 14), tileMaterial);
  const face = SLAB / 2 + EDGE;
  const markGeometry = slab(shapes.c, INLAY, 0.02, 8);
  const dotGeometry = slab(shapes.dot, INLAY, 0.02, 8);
  const c = new THREE.Mesh(markGeometry, markMaterial);
  c.position.z = face + INLAY / 2;
  // The dot sits in its own pivot so it can seat into place at its own centre.
  const dotCentre = new THREE.Vector3((495.88 - 316.115) / 316.115, -(364.18 - 316.115) / 316.115, face + INLAY / 2);
  dotGeometry.translate(-dotCentre.x, -dotCentre.y, 0);
  const dot = new THREE.Mesh(dotGeometry, markMaterial);
  dot.position.copy(dotCentre);
  // The back carries the same mark, readable from behind.
  const back = new THREE.Group();
  const backC = new THREE.Mesh(markGeometry, markMaterial);
  const backDot = new THREE.Mesh(dotGeometry, markMaterial);
  backC.position.z = face + INLAY / 2;
  backDot.position.copy(dotCentre);
  back.add(backC, backDot);
  back.rotation.y = Math.PI;
  for (const mesh of [tile, c, dot, backC, backDot]) { mesh.castShadow = true; mesh.receiveShadow = true; }
  object.add(tile, c, dot, back);

  const wear = (index: number) => {
    const way = COLOURWAYS[index];
    tileMaterial.color.set(way.tile);
    tileMaterial.sheenColor.set(way.sheen);
    markMaterial.color.set(way.mark);
    colourway = index;
  };
  const setTheme = (dark: boolean) => {
    // Each theme starts on its own official file: symbol-navy.svg on the light page,
    // logo-light.svg's symbol on the dark one. Ink in progress is dropped.
    inkStart = -1; ink.uInkRadius.value = -1;
    wear(dark ? 1 : 0);
    page.material.color.set(dark ? '#000000' : NAVY);
    page.material.opacity = dark ? 0.45 : 0.16;
  };
  setTheme(options.dark);

  const maxRatio = options.compact ? 1.75 : 2;
  const pixelBudget = options.compact ? 1.6e6 : 3.6e6;
  let cssWidth = 1, cssHeight = 1, pxPerUnit = 1;
  const stats = { frames: 0, ratio: 1 };
  const resize = (width: number, height: number) => {
    cssWidth = Math.max(1, width); cssHeight = Math.max(1, height);
    const ratio = Math.min(window.devicePixelRatio || 1, maxRatio, Math.sqrt(pixelBudget / (cssWidth * cssHeight)));
    renderer.setPixelRatio(ratio);
    renderer.setSize(cssWidth, cssHeight, false);
    camera.aspect = cssWidth / cssHeight;
    camera.updateProjectionMatrix();
    pxPerUnit = (cssHeight / 2) / (DISTANCE * Math.tan((FOV / 2) * Math.PI / 180));
    stats.ratio = ratio;
  };

  // Ink: where the drop lands, found by casting a ray at the object.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const random = () => Math.random();
  let inkDisabled = false;
  const splash = (x: number, y: number) => {
    if (inkStart >= 0 || inkDisabled) return null;
    pointer.set((x / cssWidth) * 2 - 1, -(y / cssHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(object, true);
    if (!hits.length) return null;
    const local = object.worldToLocal(hits[0].point.clone());
    ink.uInkCentre.value.copy(local);
    ink.uInkSeed.value = random() * 50;
    for (const drop of ink.uDrops.value) {
      // farther droplets are smaller and more stretched, as a real splash throws them
      const angle = random() * Math.PI * 2, reach = random(), distance = 0.12 + reach * 0.6;
      drop.set(Math.cos(angle) * distance, Math.sin(angle) * distance, 0.014 + Math.pow(random(), 2) * 0.07 * (1.2 - reach), 0.2 + reach * 1.3);
    }
    for (const drip of ink.uDrips.value) drip.set((random() - 0.5) * 1.1, 0.025 + random() * 0.03, 0.25 + random() * 0.45, 0);
    inkTarget = (colourway + 1) % COLOURWAYS.length;
    tileInk.value.set(COLOURWAYS[inkTarget].tile);
    markInk.value.set(COLOURWAYS[inkTarget].mark);
    inkStart = performance.now();
    return { x: local.x, y: local.y };
  };
  const outBack = (t: number, s: number) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
  const inOutSine = (t: number) => -(Math.cos(Math.PI * Math.min(1, Math.max(0, t))) - 1) / 2;
  const stepInk = () => {
    if (inkStart < 0) return;
    const t = performance.now() - inkStart;
    // lands as a small drop, sits for a beat, then spreads over (and around) the whole object;
    // runs drip down from it, and a ripple crosses the surface ahead of the front
    const splashSize = 0.1 * outBack(Math.min(1, t / 90), 2);
    const spread = inOutSine((t - 150) / (INK_TIME - 150));
    ink.uInkRadius.value = splashSize + 3.2 * spread;
    ink.uDropGrow.value = Math.min(1, t / 140) * (1 + 1.6 * spread);
    ink.uDripGrow.value = inOutSine((t - 250) / 900);
    ink.uRipple.value = Math.min(1, t / 60) * Math.exp(-t / 650);
    if (t >= INK_TIME) { wear(inkTarget); inkStart = -1; ink.uInkRadius.value = -1; ink.uDropGrow.value = 0; ink.uDripGrow.value = 0; ink.uRipple.value = 0; }
  };

  let lost = false;
  const draw = (placement: Placement, pose: Pose) => {
    if (lost) return;
    stepInk();
    const half = placement.half / pxPerUnit; // world units per tile half-size
    holder.position.set((placement.x - cssWidth / 2) / pxPerUnit, -(placement.y - cssHeight / 2) / pxPerUnit + pose.lift * half, 0);
    holder.scale.setScalar(half * pose.scale);
    object.rotation.set(pose.tilt.x, pose.spin + pose.tilt.y, 0, 'YXZ');
    if (pose.orient) object.quaternion.premultiply(handTurn.set(...pose.orient));
    dot.scale.setScalar(Math.max(0.0001, pose.dot));
    dot.position.z = dotCentre.z + (1 - Math.min(1, pose.dot)) * 0.35;
    scene.environmentRotation.set(0, pose.sweep, 0);
    object.updateMatrixWorld(true);
    ink.uInkMatrix.value.copy(object.matrixWorld).invert();
    ink.uInkBumpScale.value = holder.scale.x;
    // Shadow: the page sits behind the tile; the key throws the shadow down and to the right.
    page.position.set(0, 0, -0.7 * half);
    key.position.set(holder.position.x - 2.2 * half, holder.position.y + 3.4 * half, 9 * half);
    key.target.position.copy(holder.position);
    const s = 2.2 * half;
    Object.assign(key.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.1, far: 30 * half });
    key.shadow.camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    stats.frames++;
  };

  resize(canvas.clientWidth || 1, canvas.clientHeight || 1);
  // If a browser rejects the ink shader, the symbol stays in 3D without the ink.
  let shaderFailed = false;
  renderer.debug.onShaderError = () => { shaderFailed = true; };
  await renderer.compileAsync(scene, camera);
  renderer.render(scene, camera);
  if (shaderFailed) {
    for (const material of [tileMaterial, markMaterial]) {
      material.onBeforeCompile = () => {};
      material.customProgramCacheKey = () => 'logo-plain';
      material.needsUpdate = true;
    }
    inkDisabled = true;
    await renderer.compileAsync(scene, camera);
  }
  renderer.debug.onShaderError = null;

  const handleLost = (event: Event) => { event.preventDefault(); lost = true; options.onLost(); };
  canvas.addEventListener('webglcontextlost', handleLost);

  return {
    draw, resize, setTheme, stats, splash,
    get inking() { return inkStart >= 0; },
    dispose: () => {
      canvas.removeEventListener('webglcontextlost', handleLost);
      for (const g of [tile.geometry, markGeometry, dotGeometry, page.geometry]) g.dispose();
      for (const m of [tileMaterial, markMaterial, page.material]) m.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
