import { FRAGMENT, VERTEX } from './shader';
import { cameraBasis, type Camera } from './camera';
import type { Placement, Shape } from './timeline';

/*
  A single full-screen pass; no scene graph is needed, so no engine is loaded.
  Draws only when asked (scroll or pointer changed), at an internal resolution that adapts to
  the device. Object rays are bounded by a sphere; the floor is one analytic plane.
*/
export type Floor = { fold: number; height: number; visibility: number; cell: number; alignX: number; alignY: number };
export type Frame = { placement: Placement; shape: Shape; camera: Camera; floor: Floor; visible: boolean };
export type StoryRenderer = {
  draw: (frame: Frame) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
  readonly stats: { frames: number; scale: number; gpu: number };
};
type Options = { compact: boolean; onLost: () => void };

export function supportsWebGL2() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
  } catch { return false; }
}

export type DistanceField = { width: number; height: number; data: Float32Array };

/** Loads the baked field; values are signed distances in [-1, 1] × range. */
export async function loadDistanceField(url: string, signal?: AbortSignal): Promise<DistanceField> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Distance field unavailable');
  // No colour management: the PNG holds data, and any conversion would corrupt it.
  const bitmap = await createImageBitmap(await response.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const data = new Float32Array(canvas.width * canvas.height);
  for (let i = 0; i < data.length; i++) data[i] = (pixels[i * 4] * 256 + pixels[i * 4 + 1]) / 65535 * 2 - 1;
  return { width: canvas.width, height: canvas.height, data };
}

/**
  Compiles off the main thread where KHR_parallel_shader_compile exists (all current engines):
  status queries block until the GPU process finishes, so completion is polled across frames
  first. A raymarching program can take hundreds of milliseconds to translate.
*/
export async function createStoryRenderer(canvas: HTMLCanvasElement, field: DistanceField, { compact, onLost }: Options): Promise<StoryRenderer> {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'default' });
  if (!gl) throw new Error('WebGL2 unavailable');

  const shader = (type: number, source: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return s;
  };
  const program = gl.createProgram()!;
  const vs = shader(gl.VERTEX_SHADER, VERTEX);
  const fs = shader(gl.FRAGMENT_SHADER, FRAGMENT);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  if (parallel) {
    while (!gl.isContextLost() && !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
    const log = gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(program) || 'Program link failed';
    gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs);
    throw new Error(log);
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const location = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);

  // The baked field is 16-bit fixed point in R/G; decoded once to a filterable half-float texture.
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, field.width, field.height, 0, gl.RED, gl.FLOAT, field.data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const u = { res: uniform('uRes'), place: uniform('uPlace'), shape: uniform('uShape'), flat: uniform('uFlat'), camera: uniform('uCamera'), lens: uniform('uLens'), grid: uniform('uGrid'), bound: uniform('uBound'), field: uniform('uField') };
  gl.uniform1i(u.field, 0);
  gl.clearColor(0, 0, 0, 0);

  // Internal resolution: device pixels × quality, under a pixel budget. The surfaces are matte
  // and the silhouettes carry analytic anti-aliasing, so retina density is not needed.
  // Quality adapts with hysteresis to measured GPU time where the browser exposes it: a
  // sustained overrun steps down, a sustained margin steps back up, so one heavy beat does
  // not soften the rest of the story.
  const maxRatio = compact ? 1.25 : 1.5;
  const pixelBudget = compact ? 0.9e6 : 2.4e6;
  let quality = compact ? 0.9 : 1;
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2') as { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;
  let query: WebGLQuery | null = null;
  let gpuAverage = 0;
  let gpuSamples = 0;
  let gpuOver = 0;
  let gpuUnder = 0;
  const startQuality = compact ? 0.9 : 1;
  let cssWidth = 1;
  let cssHeight = 1;
  let ratio = 1;
  let lost = false;
  let last = 0;
  let slow = 0;
  const stats = { frames: 0, scale: 1, gpu: 0 };
  const matrix = new Float32Array(9);

  const resize = (width: number, height: number) => {
    cssWidth = Math.max(1, width);
    cssHeight = Math.max(1, height);
    ratio = Math.min(window.devicePixelRatio || 1, maxRatio, Math.sqrt(pixelBudget / (cssWidth * cssHeight))) * quality;
    canvas.width = Math.round(cssWidth * ratio);
    canvas.height = Math.round(cssHeight * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.res, canvas.width, canvas.height);
    stats.scale = ratio;
  };

  const draw = ({ placement, shape, camera, floor, visible }: Frame) => {
    if (lost) return;
    const stepDown = () => { if (quality > 0.6) { quality *= 0.85; resize(cssWidth, cssHeight); } };
    const stepUp = () => { if (quality < startQuality) { quality = Math.min(startQuality, quality / 0.85); resize(cssWidth, cssHeight); } };
    if (timer && query) {
      // Read the previous frame's GPU time once it is ready; never block waiting for it.
      if (gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
        const disjoint = gl.getParameter(timer.GPU_DISJOINT_EXT);
        const ms = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6;
        gl.deleteQuery(query); query = null;
        // The first frames include driver warm-up and are not representative.
        if (!disjoint && ++gpuSamples > 6) {
          gpuAverage = gpuAverage ? gpuAverage * 0.85 + ms * 0.15 : ms;
          stats.gpu = Math.round(gpuAverage * 10) / 10;
          // Keep the object well inside a 60 Hz frame, leaving room for the compositor.
          // Only a sustained overrun steps down; then measure afresh at the new size.
          gpuOver = gpuAverage > 12 ? gpuOver + 1 : 0;
          gpuUnder = gpuAverage < 6.5 ? gpuUnder + 1 : 0;
          if (gpuOver > 20) { stepDown(); gpuOver = gpuUnder = 0; gpuAverage = 0; gpuSamples = 0; }
          else if (gpuUnder > 90) { stepUp(); gpuOver = gpuUnder = 0; gpuAverage = 0; gpuSamples = 0; }
        }
      }
    } else if (!timer) {
      // Fallback: consecutive frames slower than ~45 fps suggest a GPU-bound page.
      const now = performance.now();
      if (last && now - last < 60) {
        slow = now - last > 22 ? slow + 1 : Math.max(0, slow - 1);
        if (slow > 12) { stepDown(); slow = 0; }
      }
      last = now;
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!visible) return;

    const x = placement.x * ratio;
    const y = (cssHeight - placement.y) * ratio;
    const s = placement.scale * ratio;
    const { right, up, back } = cameraBasis(camera);
    matrix.set([...right, ...up, ...back]);
    gl.uniform3f(u.place, x, y, s);
    gl.uniform4f(u.shape, shape.open, shape.split, shape.dot, shape.tile);
    gl.uniform1f(u.flat, shape.flat);
    gl.uniformMatrix3fv(u.camera, false, matrix);
    gl.uniform4f(u.lens, camera.distance, camera.ortho, floor.fold, floor.visibility);
    gl.uniform4f(u.grid, floor.cell, floor.alignX, floor.alignY, floor.height);
    // Tight bound per stage: rays that cannot reach the object never start marching.
    gl.uniform1f(u.bound, 1.16 + 0.64 * Math.min(1, shape.tile / 0.3));
    const timing = timer && !query ? gl.createQuery() : null;
    if (timing && timer) gl.beginQuery(timer.TIME_ELAPSED_EXT, timing);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (timing && timer) { gl.endQuery(timer.TIME_ELAPSED_EXT); query = timing; }
    stats.frames++;
  };

  const handleLost = (event: Event) => { event.preventDefault(); lost = true; onLost(); };
  canvas.addEventListener('webglcontextlost', handleLost);

  return {
    draw,
    resize,
    stats,
    dispose: () => {
      canvas.removeEventListener('webglcontextlost', handleLost);
      if (!gl.isContextLost()) {
        if (query) gl.deleteQuery(query);
        gl.deleteTexture(texture); gl.deleteBuffer(buffer);
        gl.deleteShader(vs); gl.deleteShader(fs); gl.deleteProgram(program);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    },
  };
}
