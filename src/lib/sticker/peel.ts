import * as THREE from 'three';

/*
  The sticker as a sheet of paper, drawn in real time over the closing section.

  The sheet is a finely divided plane. A peel is described by a line on the sticker (normal n,
  position c): paper on the near side stays stuck; past it, the paper rolls around a cylinder
  of radius r and lies back over itself, as a peeled sticker does, showing its paper back.
  The adhesive front is not perfectly straight (a slight wave). Shading comes from the bent
  normals and two lights; a soft shadow (a blurred silhouette) falls away from the paper the
  higher it lifts.

  Everything here is drawing; the physics (resistance, the sticker hanging from the finger,
  the fall) live in components/sticker.tsx. Coordinates are the section's CSS pixels, y down.
*/

export type Peel = { n: [number, number]; c: number; r: number; wave: number; phase: number };
export type StickerFrame = {
  /** Centre of the sticker's place, in section pixels (y down), and its side. */
  centre: { x: number; y: number };
  size: number;
  /** Stuck (or being peeled) on its place. */
  peel?: Peel;
  /** Off the page: local (y down, origin at the centre) → section pixels, as [a, b, c, d, e, f]. */
  affine?: [number, number, number, number, number, number];
  /** Height above the page while off it, in pixels (shadow distance). */
  height?: number;
  opacity?: number;
};
export type StickerRenderer = { draw: (frame: StickerFrame) => void; resize: (width: number, height: number) => void; dispose: () => void };

const SEGMENTS = 72;
const LIGHT = new THREE.Vector2(0.42, 0.62); // shadow offset per pixel of height (light high, top-left)

const DEFORM = `
uniform vec2 uN;
uniform float uC;
uniform float uR;
uniform float uWave;
uniform float uPhase;
uniform float uHeight;
uniform float uFaceSign;
vec3 peelPos;
vec3 peelNormal;
float peelZ;
void peelSheet(vec3 position) {
  // logic space: y down, origin at the centre
  vec2 p = vec2(position.x, -position.y);
  vec2 n = uN;
  vec2 t = vec2(-n.y, n.x);
  float a = dot(p, n);
  float c = uC + uWave * sin(dot(p, t) * 0.085 + uPhase) + uWave * 0.5 * sin(dot(p, t) * 0.23 - uPhase * 1.7);
  float s = a - c;
  vec2 q = p;
  float z = 0.0;
  vec3 nn = vec3(0.0, 0.0, 1.0);
  if (s > 0.0) {
    float arc = 3.14159265 * uR;
    float along, ang;
    if (s < arc) { ang = s / uR; along = c + uR * sin(ang); z = uR * (1.0 - cos(ang)); }
    else { ang = 3.14159265; along = c - (s - arc); z = 2.0 * uR; }
    q = p + n * (along - a);
    nn = vec3(-n * sin(ang), cos(ang));
  }
  z += uHeight;
  peelPos = vec3(q.x, -q.y, z);
  peelNormal = vec3(nn.x, -nn.y, nn.z);
  peelZ = z;
}`;

/** The sticker's face: the official symbol-light.svg on its die-cut paper margin. */
async function faceTexture(size: number) {
  const image = new Image();
  image.decoding = 'async';
  image.src = '/brand/symbol-light.svg';
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const radius = size * 0.2857;
  ctx.fillStyle = '#F8F6F0';
  ctx.beginPath(); ctx.roundRect(0, 0, size, size, radius); ctx.fill();
  const pad = size * 0.0625;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(pad, pad, size - 2 * pad, size - 2 * pad, radius - pad); ctx.clip();
  ctx.drawImage(image, pad, pad, size - 2 * pad, size - 2 * pad);
  ctx.restore();
  return canvas;
}

/** The silhouette, blurred: alpha for the soft shadow. */
function shadowTexture(size: number) {
  const canvas = document.createElement('canvas');
  const blur = size * 0.08;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.filter = `blur(${blur}px)`;
  ctx.fillStyle = '#000';
  const inset = blur * 1.6;
  ctx.beginPath(); ctx.roundRect(inset, inset, size - 2 * inset, size - 2 * inset, (size - 2 * inset) * 0.2857); ctx.fill();
  return canvas;
}

export async function createStickerRenderer(canvas: HTMLCanvasElement): Promise<StickerRenderer> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -2000, 2000);
  camera.position.z = 1000;

  // bright enough that the flat paper reads as the brand's off-white, the curl as shade
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a96a8, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-0.45, 0.65, 0.62);
  scene.add(key);

  const face = new THREE.CanvasTexture(await faceTexture(512));
  face.colorSpace = THREE.SRGBColorSpace;
  face.anisotropy = 4;
  const soft = new THREE.CanvasTexture(shadowTexture(256));

  const uniforms = {
    uN: { value: new THREE.Vector2(0.7071, 0.7071) },
    uC: { value: 1e5 },
    uR: { value: 8 },
    uWave: { value: 0 },
    uPhase: { value: 0 },
    uHeight: { value: 0 },
    uFaceSign: { value: 1 },
  };
  const deform = (shader: THREE.WebGLProgramParametersWithUniforms, normals: boolean) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = DEFORM + '\n' + shader.vertexShader;
    if (normals) shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', 'peelSheet(position);\nvec3 objectNormal = peelNormal;\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3(tangent.xyz);\n#endif');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', (normals ? '' : 'peelSheet(position);\n') + 'vec3 transformed = peelPos;');
  };

  // Paper: a slightly glossy printed face; the back is the plain paper of the sheet.
  const paper = new THREE.MeshStandardMaterial({ map: face, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.42, metalness: 0 });
  paper.onBeforeCompile = shader => {
    deform(shader, true);
    // which side faces the reader, from the bent normal (and the mirror while in the hand)
    shader.vertexShader = 'varying float vPaperFace;\n' + shader.vertexShader.replace('vec3 objectNormal = peelNormal;', 'vec3 objectNormal = peelNormal;\nvPaperFace = peelNormal.z * uFaceSign;');
    shader.fragmentShader = 'varying float vPaperFace;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D(map, vMapUv);
  if (vPaperFace < 0.0) sampledDiffuseColor.rgb = vec3(0.86, 0.83, 0.78) * (0.94 + 0.06 * fract(sin(dot(floor(vMapUv * 220.0), vec2(12.9898, 78.233))) * 43758.5453));
  diffuseColor *= sampledDiffuseColor;
#endif`);
  };
  paper.customProgramCacheKey = () => 'sticker-paper';

  const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x050c1c, transparent: true, alphaMap: soft, depthWrite: false, opacity: 1 });
  shadowMaterial.onBeforeCompile = shader => {
    deform(shader, false);
    // falls away from the paper: down and to the right, further and fainter the higher it is
    shader.vertexShader = shader.vertexShader.replace('vec3 transformed = peelPos;', 'vec3 transformed = vec3(peelPos.x + peelZ * ' + LIGHT.x.toFixed(3) + ', peelPos.y - peelZ * ' + LIGHT.y.toFixed(3) + ', -1.0);\nvShadowLift = peelZ;');
    shader.vertexShader = 'varying float vShadowLift;\n' + shader.vertexShader;
    shader.fragmentShader = 'varying float vShadowLift;\n' + shader.fragmentShader.replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= mix(0.42, 0.18, clamp(vShadowLift / 60.0, 0.0, 1.0));');
  };
  shadowMaterial.customProgramCacheKey = () => 'sticker-shadow';

  const geometry = new THREE.PlaneGeometry(1, 1, SEGMENTS, SEGMENTS);
  const sheet = new THREE.Mesh(geometry, paper);
  const shade = new THREE.Mesh(geometry, shadowMaterial);
  for (const mesh of [sheet, shade]) { mesh.matrixAutoUpdate = false; mesh.frustumCulled = false; }
  shade.renderOrder = -1;
  scene.add(shade, sheet);

  let width = 1, height = 1;
  const resize = (w: number, h: number) => {
    width = Math.max(1, w); height = Math.max(1, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    Object.assign(camera, { left: 0, right: width, top: 0, bottom: -height });
    camera.updateProjectionMatrix();
  };

  const matrix = new THREE.Matrix4();
  const draw = (frame: StickerFrame) => {
    const s = frame.size;
    if (frame.affine) {
      const [a, b, c, d, e, f] = frame.affine;
      matrix.set(a * s, -c * s, 0, e, -b * s, d * s, 0, -f, 0, 0, 1, 0, 0, 0, 0, 1);
      uniforms.uC.value = 1e5;
      uniforms.uHeight.value = frame.height ?? 0;
      uniforms.uFaceSign.value = a * d - b * c < 0 ? -1 : 1;
    } else {
      matrix.set(s, 0, 0, frame.centre.x, 0, s, 0, -frame.centre.y, 0, 0, 1, 0, 0, 0, 0, 1);
      uniforms.uHeight.value = 0;
      uniforms.uFaceSign.value = 1;
      const peel = frame.peel;
      if (peel) {
        // the peel is in pixels; the sheet is a unit plane scaled by s, so express it per unit
        uniforms.uN.value.set(peel.n[0], peel.n[1]);
        uniforms.uC.value = peel.c / s;
        uniforms.uR.value = Math.max(0.5, peel.r) / s;
        uniforms.uWave.value = peel.wave / s;
        uniforms.uPhase.value = peel.phase;
      } else uniforms.uC.value = 1e5;
    }
    // height is in pixels while the plane is in units: scale the z column back
    matrix.elements[10] = s;
    sheet.matrix.copy(matrix);
    shade.matrix.copy(matrix);
    sheet.matrixWorldNeedsUpdate = shade.matrixWorldNeedsUpdate = true;
    uniforms.uHeight.value /= s;
    paper.opacity = shadowMaterial.opacity = frame.opacity ?? 1;
    renderer.render(scene, camera);
  };

  await renderer.compileAsync(scene, camera);
  return {
    draw, resize,
    dispose: () => { geometry.dispose(); paper.dispose(); shadowMaterial.dispose(); face.dispose(); soft.dispose(); renderer.dispose(); renderer.forceContextLoss(); },
  };
}
