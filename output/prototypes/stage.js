// Shared prototype stage: homepage chrome, scroll clock, lighting rig, chapter copy and the
// exact hand-off to the official logo. Each concept supplies only its object and choreography.
import * as THREE from 'three';
import { EffectComposer } from './vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from './vendor/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from './vendor/jsm/postprocessing/OutputPass.js';

export const BRAND = {
  navy: new THREE.Color('#183255'),
  orange: new THREE.Color('#C16042'),
  sand: new THREE.Color('#E8D8C5'),
  paper: new THREE.Color('#F8F6F0'),
};

// Official symbol measurements (symbol-navy.svg, 632.23 units square), normalised so the tile
// spans -1..1. The C was fitted from 4000 samples of its path (see README).
const U = 316.115;
export const SYMBOL = {
  unit: U,
  corner: 162.68 / U,
  outer: { x: (312.33 - U) / U, y: -(316.14 - U) / U, r: 208.78 / U },
  inner: { x: (314.37 - U) / U, y: -(316.22 - U) / U, r: 145.05 / U },
  centre: { x: (313 - U) / U, y: 0 },
  gap: { from: -44.52, to: 43.14 }, // degrees, empty of C geometry
  dot: { x: (495.88 - U) / U, y: -(364.18 - U) / U, r: 32.47 / U },
};
SYMBOL.mid = (SYMBOL.outer.r + SYMBOL.inner.r) / 2;
SYMBOL.band = SYMBOL.outer.r - SYMBOL.inner.r;

// Flat states divide by this so the last 3D frame lands on the brand colours exactly.
export const EXPOSURE = 1.42;

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const range = (p, a, b) => clamp((p - a) / (b - a));
export const smooth = t => t * t * (3 - 2 * t);
export const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // cubic in-out
export const mix = (a, b, t) => a + (b - a) * t;

export const CHAPTERS = [
  { at: [0.13, 0.31], text: 'A semente de uma ideia.' },
  { at: [0.31, 0.50], text: 'Ao abrir, se torna uma possibilidade de conexão.' },
  { at: [0.50, 0.67], text: 'Mas ela ainda precisa de um ponto de encontro.' },
  { at: [0.67, 0.84], text: 'A Connections Hub é o ponto central que reúne clientes aos melhores serviços.' },
];
export const FINALE = { flat: [0.82, 0.9], move: [0.82, 0.9], swap: 0.93, name: [0.935, 0.99] };

/*
  Studio for image-based light. Matte surfaces show the light's shape only as broad falloff,
  so the room is deliberately simple: one large softbox high on the left (the film's key), a
  warm bounce from the paper below, a weak fill on the right, dark everywhere else.
*/
function studio() {
  const room = new THREE.Scene();
  room.background = new THREE.Color(0.035, 0.035, 0.04);
  const panel = (w, h, [x, y, z], color, power) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); room.add(m);
  };
  panel(7, 7, [-5, 6, 6], '#ffffff', 5.5);     // key softbox
  panel(14, 4, [0, -6, 3], '#F8F1E6', 0.9);    // paper bounce
  panel(4, 9, [7, 1, 4], '#EEF2F8', 0.9);      // fill
  panel(10, 2, [0, 7, -4], '#ffffff', 1.2);    // top rim strip
  return room;
}

function chrome(title) {
  document.body.insertAdjacentHTML('afterbegin', `
  <header class="nav"><div class="shell nav-row">
    <img class="nav-logo" src="brand/logo.svg" alt="Connections Hub" width="1408" height="311">
    <nav><a>Sobre</a><a>Soluções</a><a>Processo</a><a>Manifesto</a></nav>
    <a class="btn btn-primary small">Fale conosco</a>
  </div></header>
  <section class="story" data-story>
    <div class="pin">
      <canvas class="gl"></canvas>
      <div class="hero shell" data-hero>
        <p class="label"><i></i>Desenvolvimento de software sob medida</p>
        <h1><span>Conectando ideias.</span><span>Construindo soluções.</span></h1>
        <p class="lead">Sites, sistemas e ERP, dashboards e e-commerces pensados para a realidade de cada negócio, do planejamento à implantação.</p>
        <div class="actions"><a class="btn btn-primary">Fale sobre seu projeto →</a><a class="btn btn-secondary">Ver soluções</a></div>
      </div>
      <ol class="chapters shell">${CHAPTERS.map(c => `<li>${c.text}</li>`).join('')}</ol>
      <div class="lockup"><div class="mark"><img src="brand/logo.svg" alt="" width="1408" height="311"></div><p>Pessoas. Ideias. Tecnologia.</p></div>
      <p class="tag">${title}</p>
    </div>
  </section>
  <section class="after shell"><p class="label">Protótipo isolado · não integrado ao site</p></section>`);
}

/*
  createStage({ title, build }) → build(scene, rig) must return { group, update(p, rig) }.
  The group is posed in its own units (tile half-size = 1); the stage places and scales it,
  and at the end lays it frontal and flat over the official logo file.
*/
export async function createStage({ title, build, background = 'wall' }) {
  chrome(title);
  await document.fonts.ready;
  const canvas = document.querySelector('canvas.gl');
  const section = document.querySelector('[data-story]');
  const pin = section.querySelector('.pin');
  const hero = section.querySelector('[data-hero]');
  const chapters = [...section.querySelectorAll('.chapters li')];
  const lockup = section.querySelector('.lockup');
  const mark = lockup.querySelector('.mark');
  const markImg = mark.querySelector('img');
  const line = lockup.querySelector('p');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps brand hues; no filmic desaturation
  renderer.toneMappingExposure = EXPOSURE;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio(), 0).texture;
  scene.environmentIntensity = 1;

  const camera = new THREE.PerspectiveCamera(16, 1, 0.1, 200); // long lens: product-photo compression
  camera.position.set(0, 0, 30);

  // Key light: high and to the left, like the film. Soft shadow onto the page behind.
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 22;
  key.shadow.blurSamples = 24;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.01;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xfff4ea, 0.35);
  scene.add(rim);

  // The page itself receives the shadow; its colour comes from CSS, never from lighting.
  const page = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ color: 0x0b1a33, opacity: 0.16, transparent: true }));
  page.receiveShadow = true;
  scene.add(page);

  // Ambient occlusion: recesses and contact edges darken by geometry, not by painted shading.
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, 1, 1);
  gtao.blendIntensity = 1;
  composer.addPass(gtao);
  window.__gtao = gtao;
  window.__three = { scene, renderer, key, THREE };
  composer.addPass(new OutputPass());
  let aoRadius = 0;

  const holder = new THREE.Group(); // placement on screen
  scene.add(holder);
  const rig = { THREE, scene, camera, renderer, key, rim, page, holder, background, pointer: { x: 0, y: 0 }, viewport: { w: 1, h: 1 } };
  const concept = await build(scene, rig);
  holder.add(concept.group);

  // ── layout
  let W = 1, H = 1, narrow = false, pxPerUnit = 1;
  const resize = () => {
    W = pin.clientWidth; H = pin.clientHeight; narrow = W < 760 || W / H < 1.05;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    pxPerUnit = (H / 2) / (camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    rig.viewport = { w: W, h: H, narrow };
  };
  const toWorld = (sx, sy) => ({ x: (sx - W / 2) / pxPerUnit, y: -(sy - H / 2) / pxPerUnit });

  // Where the symbol sits during the story, and where the official file sits at the end.
  const storyPlace = () => narrow
    ? { ...toWorld(W / 2, H * 0.34), half: Math.min(W * 0.36, H * 0.2) / pxPerUnit }
    : { ...toWorld(W * 0.66, H * 0.5), half: Math.min(W * 0.2, H * 0.32) / pxPerUnit };
  const lockPlace = () => {
    const r = markImg.getBoundingClientRect(), p = pin.getBoundingClientRect();
    const k = r.width / 1407.79; // logo.svg units → px
    const half = (282.78 / 2) * k; // logo.svg tile: x 0..282.78, y 28.05..310.83
    const cx = r.left - p.left + half, cy = r.top - p.top + (28.05 + 141.39) * k;
    return { ...toWorld(cx, cy), half: half / pxPerUnit };
  };

  // ── clock
  const params = new URLSearchParams(location.search);
  let fixed = params.has('p') ? Number(params.get('p')) : null;
  let target = 0, shown = 0, last = 0;
  const progress = () => {
    const total = section.offsetHeight - pin.offsetHeight;
    return total > 0 ? clamp(-section.getBoundingClientRect().top / total) : 0;
  };

  const apply = p => {
    const story = storyPlace(), lock = lockPlace();
    const move = ease(range(p, ...FINALE.move));
    const half = mix(story.half, lock.half, move);
    holder.position.set(mix(story.x, lock.x, move), mix(story.y, lock.y, move), 0);
    holder.scale.setScalar(half);

    // light rig follows the object so shadows keep their length at every size
    const [kx, ky, kz] = rig.keyAngle ?? [-5, 7, 14];
    key.position.set(holder.position.x + kx * half, holder.position.y + ky * half, kz * half);
    key.target.position.copy(holder.position);
    const s = 2.4 * half;
    Object.assign(key.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.1, far: 40 * half });
    key.shadow.camera.updateProjectionMatrix();
    rim.position.set(holder.position.x + 8 * half, holder.position.y + 2 * half, -4 * half);

    concept.update(p, rig);

    const flat = ease(range(p, ...FINALE.flat));
    page.material.opacity = 0.16 * (1 - flat);

    // copy
    const out = smooth(range(p, 0.05, 0.12));
    hero.style.opacity = String(1 - out);
    hero.style.transform = `translate3d(0, ${-out * 48}px, 0)`;
    chapters.forEach((el, i) => {
      const [a, b] = CHAPTERS[i].at;
      const enter = smooth(range(p, a, a + 0.035)), leave = i === 3 ? smooth(range(p, 0.82, 0.86)) : smooth(range(p, b - 0.03, b));
      el.style.opacity = String(enter * (1 - leave));
      el.style.transform = `translate3d(0, ${(1 - enter) * 16 - leave * 16}px, 0)`;
    });
    // The official file sits under the flattened object, then the object dissolves into it.
    const handed = p >= 0.9;
    canvas.style.opacity = String(1 - smooth(range(p, 0.9, FINALE.swap)));
    const share = 282.78 / 1407.79;
    const name = handed ? share + smooth(range(p, ...FINALE.name)) * (1 - share) : 0;
    mark.style.clipPath = `inset(-2px ${((1 - name) * 100).toFixed(3)}% -2px 0)`;
    line.style.opacity = String(smooth(range(p, 0.96, 1)));
    if (Math.abs(aoRadius - half) > 1e-3) {
      aoRadius = half;
      gtao.updateGtaoMaterial({ radius: 0.4 * half, distanceExponent: 1.6, thickness: 0.8 * half, scale: 1, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    }
    gtao.blendIntensity = rig.ao ?? 1;
    composer.render();
  };

  // On-demand: a frame is drawn only when the story position or the pointer moved.
  let drawn = -1, drawnPointer = '';
  const tick = now => {
    const dt = last ? Math.min(64, now - last) : 16; last = now;
    if (fixed === null) {
      target = progress();
      shown += (target - shown) * (1 - Math.exp(-dt / 90));
      if (Math.abs(target - shown) < 1e-5) shown = target;
      const pointer = `${rig.pointer.x.toFixed(3)},${rig.pointer.y.toFixed(3)}`;
      if (shown !== drawn || pointer !== drawnPointer) { apply(shown); drawn = shown; drawnPointer = pointer; }
    }
    requestAnimationFrame(tick);
  };

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', e => { rig.pointer = { x: e.clientX / W * 2 - 1, y: e.clientY / H * 2 - 1 }; }, { passive: true });
  resize();
  // Compile every program up front (hidden meshes included) so no state change stalls a frame.
  for (const p of [0, 0.3, 0.5, 0.62, 0.72, 0.8, 0.86, 0.95]) apply(p);
  const hidden = [];
  scene.traverse(o => { if (!o.visible) { hidden.push(o); o.visible = true; } });
  await renderer.compileAsync(scene, camera);
  composer.render();
  hidden.forEach(o => { o.visible = false; });
  apply(0);
  // capture hooks: render an exact progress synchronously
  window.__setP = p => { fixed = p; shown = p; apply(p); };
  window.__free = () => { fixed = null; };
  requestAnimationFrame(tick);
  document.documentElement.dataset.ready = 'true';
}
