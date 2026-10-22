import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { studio } from '@/lib/logo/renderer';

/*
  The Security vault: this site's content policy as a physical object, one lacquered piece per
  character, in the same studio light and finish as the symbol in the opening.

    plaintext   pieces in the official paper colourway (symbol-light: paper body, navy mark),
                laid out as the code reads, so the block has the code's ragged shape;
    encrypting  every piece lifts off the page, turns over and flies to a new place
                (diffusion), changing its character and colour at the turn (substitution),
                and the block closes as a perfect rectangle in the logo-light colourway
                (terracotta body, paper mark). A dashed outline of the original shape stays on
                the page: the ciphertext is not a scaled copy of the code, it has no shape left;
    tampering   a clicked cipher piece turns navy (symbol-navy colourway) with another character;
    refused     the pieces start to lift, the check fails, and they slam back down with a shake.

  Glyphs come from a canvas atlas drawn in the page's own monospace font, sampled on the front
  face of each piece by a small addition to the physical material. Draws only while something
  moves; the caller hides it when it is off screen.
*/

export type Tone = 'plain' | 'keyword' | 'string' | 'comment' | 'punct' | 'fn' | 'type' | 'number';
export type Glyph = { ch: string; tone: Tone };

export type VaultRenderer = {
  /** Plaintext → ciphertext (base64, one piece per character). Resolves when it has settled. */
  encrypt: (cipher: string) => Promise<void>;
  /** Ciphertext → plaintext. */
  decrypt: () => Promise<void>;
  /** A failed decryption: lift, refuse, settle. */
  refuse: () => Promise<void>;
  /** The cipher piece under (x, y) in canvas pixels, or null. */
  pick: (x: number, y: number) => number | null;
  /** Shows a changed character on a cipher piece (tampering). */
  mark: (index: number, ch: string) => void;
  /** Hover feedback in the cipher state. */
  hover: (index: number | null) => void;
  /** Pointer lean (-1..1) and hand turn (radians). */
  lean: (x: number, y: number) => void;
  turn: (x: number, y: number, held: boolean) => void;
  resize: (width: number, height: number) => void;
  setVisible: (visible: boolean) => void;
  dispose: () => void;
  readonly stats: { frames: number };
};

const NAVY = '#183255', ORANGE = '#C16042', PAPER = '#F8F6F0', SLATE = '#6B7C8E', SAND = '#E8D8C5';
const INK: Record<Tone, string> = { plain: NAVY, fn: NAVY, type: NAVY, punct: SLATE, comment: SLATE, string: SLATE, keyword: ORANGE, number: ORANGE };
const BODY = { plain: PAPER, cipher: ORANGE, marked: NAVY };
const MARK = { cipher: PAPER, marked: ORANGE };

const W = 1, H = 1.3, D = 0.42;     // piece size (monospace cell)
const GAP_X = 0.14, GAP_Y = 0.2;
const PITCH_X = W + GAP_X, PITCH_Y = H + GAP_Y;
const FOV = 24;
const REST = { x: -0.42, y: 0.2 }; // the block lies back on the page, seen from a little left
const ATLAS = { cols: 16, rows: 6, cw: 48, ch: 62 };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const glyphIndex = (ch: string) => { const c = ch.charCodeAt(0); return c >= 32 && c < 127 ? c - 32 : 31; /* '?' */ };

function atlas(family: string) {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS.cols * ATLAS.cw;
  canvas.height = ATLAS.rows * ATLAS.ch;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 42px ${family}`;
  for (let i = 0; i < 95; i++) {
    const col = i % ATLAS.cols, row = Math.floor(i / ATLAS.cols);
    ctx.fillText(String.fromCharCode(32 + i), col * ATLAS.cw + ATLAS.cw / 2, row * ATLAS.ch + ATLAS.ch * 0.54);
  }
  return canvas;
}

type Piece = {
  plain: THREE.Vector3; cipher: THREE.Vector3;
  plainGlyph: number; cipherGlyph: number; plainInk: THREE.Color; cipherInk: THREE.Color;
  inPlain: boolean;   // has a character in the plaintext (spaces and the extra cipher length do not)
  inCipher: boolean;
  delay: number; lift: number; spin: number;
  marked: boolean;
  slot: number;       // its place in the ciphertext, or -1
};

export async function createVaultRenderer(canvas: HTMLCanvasElement, options: {
  lines: Glyph[][]; family: string; compact: boolean; reduced: boolean; onLost: () => void;
}): Promise<VaultRenderer> {
  await document.fonts?.load(`600 42px ${options.family}`).catch(() => undefined);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  const environment = studio(renderer);
  scene.environment = environment;
  scene.environmentRotation.set(0, -0.35, 0);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 400);

  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.castShadow = true;
  const mapSize = options.compact ? 1024 : 2048;
  key.shadow.mapSize.set(mapSize, mapSize);
  key.shadow.radius = options.compact ? 8 : 14;
  key.shadow.blurSamples = options.compact ? 10 : 16;
  key.shadow.bias = -0.0006;
  scene.add(key, key.target);

  // Everything lies on the page: a group tilted back, turned by the pointer and the hand.
  const block = new THREE.Group();
  scene.add(block);
  const page = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ color: '#000000', opacity: 0.42, transparent: true, toneMapped: false }));
  page.receiveShadow = true;
  page.position.z = -D / 2 - 0.02;
  block.add(page);

  // Layouts: the code as it reads, and the ciphertext as a uniform block of the same height.
  const lines = options.lines;
  const plainRows = lines.length;
  const plainCols = Math.max(...lines.map(l => l.length));
  const at = (col: number, row: number, cols: number, rows: number) =>
    new THREE.Vector3((col - (cols - 1) / 2) * PITCH_X, ((rows - 1) / 2 - row) * PITCH_Y, 0);
  const plainSlots: { pos: THREE.Vector3; glyph: Glyph }[] = [];
  lines.forEach((line, row) => line.forEach((glyph, col) => plainSlots.push({ pos: at(col, row, plainCols, plainRows), glyph })));

  // Capacity: enough pieces for the longest ciphertext this text can produce (base64 of +16 bytes).
  const bytes = new TextEncoder().encode(lines.map(l => l.map(g => g.ch).join('')).join('\n')).length;
  const capacity = Math.max(plainSlots.length, Math.ceil((bytes + 16) / 3) * 4);

  const geometry = new RoundedBoxGeometry(W, H, D, 3, 0.12);
  const material = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: 0.5, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, specularIntensity: 0.5,
    sheen: 0.2, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffffff'),
  });
  const texture = new THREE.CanvasTexture(atlas(options.family));
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  material.onBeforeCompile = shader => {
    shader.uniforms.uAtlas = { value: texture };
    shader.vertexShader = 'attribute float aGlyph;\nattribute vec3 aInk;\nvarying float vGlyph;\nvarying vec3 vInk;\nvarying vec2 vCell;\nvarying float vFront;\n' + shader.vertexShader
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvFront = objectNormal.z;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvCell = vec2(position.x / ${W.toFixed(3)} + 0.5, position.y / ${H.toFixed(3)} + 0.5);\nvGlyph = aGlyph;\nvInk = aInk;`);
    shader.fragmentShader = 'uniform sampler2D uAtlas;\nvarying float vGlyph;\nvarying vec3 vInk;\nvarying vec2 vCell;\nvarying float vFront;\n' + shader.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
if (vFront > 0.75 && vGlyph >= 0.0) {
  vec2 g = clamp(vCell, 0.04, 0.96);
  float row = floor((vGlyph + 0.5) / ${ATLAS.cols.toFixed(1)});
  float col = floor(vGlyph - row * ${ATLAS.cols.toFixed(1)} + 0.5); // exact cell: no float drift into the next one
  vec2 uv = vec2((col + g.x) / ${ATLAS.cols.toFixed(1)}, 1.0 - (row + 1.0 - g.y) / ${ATLAS.rows.toFixed(1)});
  float a = texture2D(uAtlas, uv).a;
  diffuseColor.rgb = mix(diffuseColor.rgb, vInk, a);
}`);
  };
  material.customProgramCacheKey = () => 'vault-piece';

  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.castShadow = true;
  // Pieces cast onto the page only: self-shadowing between pieces speckles their faces.
  mesh.receiveShadow = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const glyphAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity).fill(-1), 1);
  const inkAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
  glyphAttr.setUsage(THREE.DynamicDrawUsage);
  inkAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aGlyph', glyphAttr);
  geometry.setAttribute('aInk', inkAttr);
  block.add(mesh);
  for (let i = 0; i < capacity; i++) mesh.setColorAt(i, new THREE.Color(PAPER));

  // The original shape, drawn on the page as a dashed outline once the code is gone.
  const outline = (() => {
    const pts: THREE.Vector3[] = [];
    const left = (-(plainCols - 1) / 2) * PITCH_X - W / 2 - 0.25;
    const top = ((plainRows - 1) / 2) * PITCH_Y + H / 2 + 0.25;
    const edge = (row: number) => (Math.max(1, lines[row].length) - 1 - (plainCols - 1) / 2) * PITCH_X + W / 2 + 0.25;
    pts.push(new THREE.Vector3(left, top, 0));
    for (let row = 0; row < plainRows; row++) {
      const y0 = top - row * PITCH_Y, y1 = y0 - PITCH_Y;
      pts.push(new THREE.Vector3(edge(row), y0, 0), new THREE.Vector3(edge(row), y1 + (row === plainRows - 1 ? -0.3 + GAP_Y : 0), 0));
    }
    pts.push(new THREE.Vector3(left, top - plainRows * PITCH_Y - 0.3 + GAP_Y, 0), new THREE.Vector3(left, top, 0));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: SAND, dashSize: 0.45, gapSize: 0.32, transparent: true, opacity: 0 }));
    line.computeLineDistances();
    line.position.z = -D / 2 - 0.01;
    block.add(line);
    return line;
  })();

  // Pieces. Index i < plainSlots.length starts as that character; the rest start hidden.
  const pieces: Piece[] = Array.from({ length: capacity }, (_, i) => {
    const slot = plainSlots[i];
    const visible = Boolean(slot && slot.glyph.ch !== ' ');
    return {
      plain: slot ? slot.pos.clone() : new THREE.Vector3((Math.random() - 0.5) * plainCols * PITCH_X * 0.6, (Math.random() - 0.5) * plainRows * PITCH_Y * 0.6, -D),
      cipher: new THREE.Vector3(),
      plainGlyph: visible ? glyphIndex(slot!.glyph.ch) : -1,
      cipherGlyph: -1,
      plainInk: new THREE.Color(slot ? INK[slot.glyph.tone] : NAVY),
      cipherInk: new THREE.Color(MARK.cipher),
      inPlain: visible, inCipher: false,
      delay: 0, lift: 0, spin: 1, marked: false, slot: -1,
    };
  });
  const bodyPlain = new THREE.Color(BODY.plain), bodyCipher = new THREE.Color(BODY.cipher), bodyMarked = new THREE.Color(BODY.marked);
  const inkMarked = new THREE.Color(MARK.marked);

  // State of the whole block: k = 0 plaintext … 1 ciphertext.
  let k = 0;
  let anim: { from: number; to: number; start: number; ms: number; resolve: () => void } | null = null;
  let refusal: { start: number; resolve: () => void } | null = null;
  let hovered: number | null = null;
  const hoverLift = new Float32Array(capacity);
  let leanTarget = { x: 0, y: 0 }, leanNow = { x: 0, y: 0 };
  let turnTarget = { x: 0, y: 0 }, turnNow = { x: 0, y: 0 }, holding = false;
  let visible = true, lost = false, frame = 0, last = 0;
  const stats = { frames: 0 };
  const SPAN = options.reduced ? 0 : 1;

  const matrix = new THREE.Matrix4(), quat = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), axis = new THREE.Vector3(1, 0, 0);

  /** Writes every piece for the block state k (and the refusal shake, the hover lift). */
  const layout = (now: number) => {
    let shakeLift = 0;
    if (refusal) {
      const t = now - refusal.start;
      shakeLift = t < 380 ? outCubic(t / 380) * 0.9 : Math.max(0, 1 - (t - 380) / 160) * 0.9;
    }
    for (let i = 0; i < capacity; i++) {
      const p = pieces[i];
      if (!p.inPlain && !p.inCipher) { matrix.makeScale(0, 0, 0); mesh.setMatrixAt(i, matrix); continue; }
      // Each piece runs its own window inside the block's sweep.
      const u = SPAN ? clamp((k * (1 + 0.55) - p.delay * 0.55)) : k;
      const e = inOut(u);
      pos.lerpVectors(p.plain, p.cipher, e);
      pos.z += Math.sin(Math.PI * u) * p.lift + hoverLift[i] + shakeLift * (0.6 + 0.4 * Math.sin(i * 1.7));
      const turned = u > 0.5;
      quat.setFromAxisAngle(axis, -Math.PI * 2 * e * p.spin);
      // Pieces that exist on one side only grow out of (or sink into) the page.
      const presence = p.inPlain && p.inCipher ? 1 : p.inCipher ? clamp(u * 2 - 0.3) : clamp(1 - u * 2 + 0.3);
      scl.setScalar(Math.max(0.0001, presence));
      matrix.compose(pos, quat, scl);
      mesh.setMatrixAt(i, matrix);
      glyphAttr.array[i] = turned ? p.cipherGlyph : p.plainGlyph;
      const ink = turned ? (p.marked ? inkMarked : p.cipherInk) : p.plainInk;
      inkAttr.array[i * 3] = ink.r; inkAttr.array[i * 3 + 1] = ink.g; inkAttr.array[i * 3 + 2] = ink.b;
      mesh.setColorAt(i, turned ? (p.marked ? bodyMarked : bodyCipher) : bodyPlain);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    glyphAttr.needsUpdate = true;
    inkAttr.needsUpdate = true;
    (outline.material as THREE.LineDashedMaterial).opacity = 0.75 * clamp((k - 0.35) / 0.5);
  };

  let cssW = 1, cssH = 1;
  // A tall stage sees the block more from the front, so the far rows do not shrink away.
  let rest = REST;
  const frameCamera = () => {
    // Fit the larger of the two layouts, with room for the lift and the tilt.
    const cols = Math.max(plainCols, Math.ceil(capacity / plainRows));
    const tall = camera.aspect < 0.9;
    const width = cols * PITCH_X + (tall ? 1 : 3), height = plainRows * PITCH_Y + (tall ? 2 : 4);
    const vfov = (FOV * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const distance = Math.max(height / 2 / Math.tan(vfov / 2), width / 2 / Math.tan(hfov / 2)) * (tall ? 1.04 : 1.0);
    camera.position.set(0, -distance * 0.08, distance);
    camera.lookAt(0, 0, 0);
    key.position.set(-distance * 0.35, distance * 0.55, distance * 0.7);
    key.target.position.set(0, 0, 0);
    const s = Math.max(width, height) * 0.75;
    Object.assign(key.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: distance * 3 });
    key.shadow.camera.updateProjectionMatrix();
  };

  const maxRatio = options.compact ? 1.75 : 2;
  const pixelBudget = options.compact ? 1.5e6 : 3.4e6;
  const resize = (width: number, height: number) => {
    cssW = Math.max(1, width); cssH = Math.max(1, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio, Math.sqrt(pixelBudget / (cssW * cssH))));
    renderer.setSize(cssW, cssH, false);
    camera.aspect = cssW / cssH;
    camera.updateProjectionMatrix();
    rest = camera.aspect < 0.9 ? { x: -0.28, y: 0.12 } : REST;
    frameCamera();
    request();
  };

  const tick = (now: number) => {
    frame = 0;
    if (lost) return;
    const dt = last ? Math.min(50, now - last) : 16;
    last = now;
    let moving = false;
    if (anim) {
      const t = clamp((now - anim.start) / anim.ms);
      k = anim.from + (anim.to - anim.from) * t;
      if (t >= 1) { const done = anim.resolve; anim = null; done(); } else moving = true;
    }
    if (refusal) {
      const t = now - refusal.start;
      block.position.x = t > 380 ? Math.sin((t - 380) / 26) * 0.5 * Math.exp(-(t - 380) / 160) : 0;
      if (t > 1100) { block.position.x = 0; const done = refusal.resolve; refusal = null; done(); } else moving = true;
    }
    // Hover lift eases in and out.
    for (let i = 0; i < capacity; i++) {
      const target = i === hovered ? 0.35 : 0;
      if (Math.abs(hoverLift[i] - target) > 1e-3) { hoverLift[i] += (target - hoverLift[i]) * (1 - Math.exp(-dt / 70)); moving = true; }
    }
    const f = 1 - Math.exp(-dt / (holding ? 40 : 260));
    leanNow = { x: leanNow.x + (leanTarget.x - leanNow.x) * f, y: leanNow.y + (leanTarget.y - leanNow.y) * f };
    turnNow = { x: turnNow.x + (turnTarget.x - turnNow.x) * f, y: turnNow.y + (turnTarget.y - turnNow.y) * f };
    if (Math.abs(leanTarget.x - leanNow.x) + Math.abs(leanTarget.y - leanNow.y) + Math.abs(turnTarget.x - turnNow.x) + Math.abs(turnTarget.y - turnNow.y) > 1e-4) moving = true;
    block.rotation.set(rest.x + leanNow.y * 0.08 + turnNow.x, rest.y + leanNow.x * 0.12 + turnNow.y, 0, 'YXZ');
    layout(now);
    if (visible) { renderer.render(scene, camera); stats.frames++; }
    if (moving && visible) frame = requestAnimationFrame(tick); else last = 0;
  };
  const request = () => { if (!frame && !lost) frame = requestAnimationFrame(tick); };

  const run = (from: number, to: number, ms: number) => new Promise<void>(resolve => {
    anim = { from, to, start: performance.now(), ms: options.reduced ? 1 : ms, resolve };
    request();
  });

  const encrypt = (cipher: string) => {
    const rows = plainRows;
    const cols = Math.ceil(cipher.length / rows);
    // A fresh permutation: piece i goes to cipher slot order[i] (diffusion made visible).
    const order = Array.from({ length: capacity }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    pieces.forEach((p, i) => {
      const slot = order[i];
      p.marked = false;
      p.inCipher = slot < cipher.length;
      if (p.inCipher) {
        p.cipher.copy(at(slot % cols, Math.floor(slot / cols), cols, rows));
        p.cipherGlyph = glyphIndex(cipher[slot]);
      } else {
        p.cipher.copy(p.plain).setZ(-D);
        p.cipherGlyph = -1;
      }
      p.slot = p.inCipher ? slot : -1;
      // The sweep travels down the code, row by row, with a little scatter.
      p.delay = clamp((-p.plain.y / (rows * PITCH_Y) + 0.5) * 0.75 + Math.random() * 0.25);
      p.lift = 2.2 + Math.random() * 3.4;
      p.spin = Math.random() < 0.5 ? 1 : -1;
    });
    return run(0, 1, 2600);
  };
  const decrypt = () => run(1, 0, 2200);
  const refuse = () => new Promise<void>(resolve => {
    refusal = { start: options.reduced ? performance.now() - 1100 : performance.now(), resolve };
    request();
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pick = (x: number, y: number) => {
    if (k < 1 || anim) return null;
    pointer.set((x / cssW) * 2 - 1, -(y / cssH) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    block.updateMatrixWorld(true);
    const hit = raycaster.intersectObject(mesh, false)[0];
    if (hit?.instanceId === undefined) return null;
    const slot = pieces[hit.instanceId].slot;
    return slot >= 0 ? slot : null;
  };
  const pieceOfSlot = (slot: number) => pieces.findIndex(p => p.slot === slot);
  const mark = (slot: number, ch: string) => {
    const i = pieceOfSlot(slot);
    if (i < 0) return;
    pieces[i].marked = true;
    pieces[i].cipherGlyph = glyphIndex(ch);
    request();
  };
  const hover = (slot: number | null) => {
    const i = slot === null ? null : pieceOfSlot(slot);
    if (i !== hovered) { hovered = i !== null && i >= 0 ? i : null; request(); }
  };
  const lean = (x: number, y: number) => { leanTarget = { x, y }; request(); };
  const turn = (x: number, y: number, held: boolean) => { turnTarget = { x, y }; holding = held; request(); };
  const setVisible = (next: boolean) => { visible = next; if (next) request(); };

  resize(canvas.clientWidth || 1, canvas.clientHeight || 1);
  layout(performance.now());
  await renderer.compileAsync(scene, camera);
  renderer.render(scene, camera);

  const handleLost = (event: Event) => { event.preventDefault(); lost = true; options.onLost(); };
  canvas.addEventListener('webglcontextlost', handleLost);

  return {
    encrypt, decrypt, refuse, pick, mark, hover, lean, turn, resize, setVisible, stats,
    dispose: () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('webglcontextlost', handleLost);
      geometry.dispose(); material.dispose(); texture.dispose();
      outline.geometry.dispose(); (outline.material as THREE.Material).dispose();
      page.geometry.dispose(); page.material.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
