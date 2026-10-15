'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Flow, InfraRole, LayerId, Node, Project } from '@/data/projects';
import { StackFace } from './stack-face';

/*
  A project taken apart, in CSS 3D: four plates of real DOM, so text stays sharp, the theme
  is the page's, and the top plate is a working interface. The world is turned by
  rotateX(pitch) rotateZ(yaw); plates stand apart along their normal and step towards the
  viewer, so every layer keeps a band in view.

  Poses: flat (the interface square to the viewer, before the section is reached), exploded
  (the drawing), and focus (one plate brought to the front, the others put away).

  Three ways the stack answers, all drawn in the brand's drafting vocabulary (callout lines,
  the meeting point, the ring):
  - a flow: using the interface sends the point down from the control to the module, the
    table (where the written row appears) and the outside system, and back up;
  - x-ray: pointing at a control, a module, a table or a system draws, before anything is
    pressed, everything it connects to across the four layers;
  - a guide: the brand's ring moves over the interface and works it, for the guided run.
*/
export type Values = Record<string, string | number>;
export type SceneHandle = {
  run: (flow: Flow, from: HTMLElement) => void;
  /** A control of the live interface, for the guided run. */
  find: (selector: string) => HTMLElement | null;
  /** Moves the brand's ring over a control of the interface (null hides it). */
  guide: (target: HTMLElement | null, press?: boolean) => void;
};
type Copy = { more: string; roles: Record<InfraRole, string>; routes: string; columns: string; reset: string; back: string };

const ORDER = ['infra', 'data', 'services', 'interface'] as const satisfies readonly LayerId[];
const POSE = { pitch: 46, yaw: -26 };   // default; the breakpoint's --pose-pitch / --pose-yaw win
const LIMIT = { pitchMin: 18, pitchMax: 70, yawMin: -75, yawMax: 35 };
const DRAG_START = 5;          // px before a press turns the world
const PER_PX = 0.22;           // deg per px dragged
const RAY_DRAW = 300;          // ms per ray going down
const RAY_BACK = 170;          // ms per ray coming back up
const HOLD = 1500;             // ms the flow stays drawn
const ROW_HOLD = 4200;         // ms a written row stays in its table
const CUE_AFTER = 1700;        // ms after the drawing opens before the first control is pointed out

type Pose = 'flat' | 'exploded' | 'focus';
type Size = { pw: number; ph: number; gap: number; step: number; room: number; chrome: number; pitch: number; yaw: number };
type Point = { x: number; y: number; z: number };

const rad = (deg: number) => (deg * Math.PI) / 180;
/** A straight line between two points of the world, as a box turned into place. */
const beam = (a: Point, b: Point): React.CSSProperties => {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const flat = Math.hypot(dx, dy);
  return { width: `${Math.hypot(flat, dz)}px`, transform: `translate3d(${a.x}px, ${a.y}px, ${a.z}px) rotateZ(${Math.atan2(dy, dx)}rad) rotateY(${-Math.atan2(dz, flat)}rad)` };
};
const at = (p: Point) => `translate3d(${p.x}px, ${p.y}px, ${p.z}px)`;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** The row a statement writes, short: the pairs of an INSERT, the SET of an UPDATE. */
export function rowOf(sql: string) {
  const insert = sql.match(/\(([^)]*)\)\s*VALUES\s*\((.*)\)/i);
  if (insert) {
    const columns = insert[1].split(',').map(s => s.trim());
    const values = insert[2].split(/,(?![^(]*\))/).map(s => s.trim());
    return columns.map((c, i) => `${c} ${values[i] ?? '…'}`).filter(pair => !pair.endsWith('…')).slice(0, 2).join(' · ') || columns.slice(0, 2).join(' · ');
  }
  const update = sql.match(/SET\s+(.*?)(?:\s+WHERE|$)/i);
  if (update) return update[1].split(',')[0].trim();
  return sql.split(/\s+/).slice(0, 3).join(' ');
}

let arrivedOnce = false;    // module-wide: has any project opened yet

const PERSPECTIVE = 2600;      // px, as .xp-scene
const ORIGIN_Y = 0.35;         // perspective-origin, as .xp-scene

/**
 * Fit and centre of a pose: the box of all four plates as the viewer sees them, with the
 * perspective, so the drawing fills the bench without touching its edges.
 */
function frame(view: { w: number; h: number }, size: Size, pitch: number, yaw: number, spread: number, room = 0) {
  const p = rad(pitch), y = rad(yaw);
  const points: [number, number, number][] = [];
  for (let i = 0; i < 4; i++)
    for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const z = i * size.gap * spread;
      const x0 = (cx * size.pw) / 2, y0 = (cy * size.ph) / 2 + (3 - i) * size.step * spread;
      const x1 = x0 * Math.cos(y) - y0 * Math.sin(y);
      const y1 = x0 * Math.sin(y) + y0 * Math.cos(y);
      points.push([x1, y1 * Math.cos(p) - z * Math.sin(p), y1 * Math.sin(p) + z * Math.cos(p)]);
    }
  const oy = (ORIGIN_Y - 0.5) * view.h;
  const box = (fit: number, cx: number, cy: number) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y2, z] of points) {
      const k = PERSPECTIVE / (PERSPECTIVE - z * fit);
      const sx = (x * fit + cx) * k, sy = oy + (y2 * fit + cy - oy) * k;
      minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
    }
    return { minX, maxX, minY, maxY };
  };
  let fit = 1, cx = 0, cy = 0;
  for (let pass = 0; pass < 4; pass++) {
    const b = box(fit, cx, cy);
    const scale = Math.min((view.w * 0.9 - room) / (b.maxX - b.minX), (view.h * 0.86) / (b.maxY - b.minY));
    fit *= scale;
    const c = box(fit, cx, cy);
    cx -= (c.minX + c.maxX) / 2 - room / 2;
    cy -= (c.minY + c.maxY) / 2;
  }
  return { fit, cx, cy };
}

export function Scene({ project, layer, node, focus, leaving, guided, labels, interfaceLabel, t, onLayer, onNode, onFocus, onManual, children, register }: {
  project: Project;
  layer: LayerId;
  node?: string;
  focus: boolean;
  /** The project is being swapped: the drawing steps back. */
  leaving: boolean;
  /** A guided run is on: the visitor's own hand on the interface pauses it. */
  guided: boolean;
  labels: Record<LayerId, string>;
  interfaceLabel: string;
  t: Copy;
  onLayer: (layer: LayerId) => void;
  onNode: (layer: LayerId, node: Node) => void;
  onFocus: (focus: boolean) => void;
  onManual: () => void;
  /** The live interface of the shown project. */
  children: ReactNode;
  register: (handle: SceneHandle) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const over = useRef<HTMLDivElement>(null);
  const rays = useRef<HTMLDivElement>(null);
  const xray = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLSpanElement>(null);
  const [view, setView] = useState({ w: 1, h: 1 });
  const [size, setSize] = useState<Size>({ pw: 760, ph: 476, gap: 124, step: 60, room: 190, chrome: 120, pitch: POSE.pitch, yaw: POSE.yaw });
  const [arrived, setArrived] = useState(false);
  const [turn, setTurn] = useState({ pitch: POSE.pitch, yaw: POSE.yaw });
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState<LayerId | null>(null);
  const [reduced, setReduced] = useState(false);
  const touched = useRef(false);
  // Transitions start only once the scene is measured; before that, the first render's
  // placeholder size would be the starting point of every transform transition.
  const [measured, setMeasured] = useState(false);

  const pose: Pose = !arrived ? 'flat' : focus ? 'focus' : 'exploded';
  const spread = pose === 'exploded' ? 1 : 0;
  const pitch = pose === 'exploded' ? turn.pitch : 0;
  const yaw = pose === 'exploded' ? turn.yaw : 0;
  // The exploded drawing keeps room on its left for the callouts.
  // Flat and head-on, the plate keeps clear of the controls laid over the bench (back, player).
  const fitPose = pose === 'exploded' ? frame(view, size, size.pitch, size.yaw, 1, size.room) : frame({ w: view.w, h: Math.max(1, view.h - size.chrome) }, size, 0, 0, 0);

  // Plate sizes come from CSS (they change with the breakpoint); the viewport from layout.
  useLayoutEffect(() => {
    const element = viewport.current!;
    const read = () => {
      const style = getComputedStyle(element);
      const px = (name: string, fallback: number) => { const value = parseFloat(style.getPropertyValue(name)); return Number.isFinite(value) ? value : fallback; };
      const next = { pitch: px('--pose-pitch', POSE.pitch), yaw: px('--pose-yaw', POSE.yaw) };
      setSize({ pw: px('--pw', 760), ph: px('--ph', 476), gap: px('--gap', 124), step: px('--step', 60), room: px('--room', 190), chrome: px('--chrome', 120), ...next });
      setTurn(current => current.pitch === next.pitch && current.yaw === next.yaw ? current : next);
      setView({ w: element.clientWidth, h: element.clientHeight });
    };
    read();
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setMeasured(true)));
    const observer = new ResizeObserver(read);
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);

  // The drawing opens once the section is in view: the interface first, square to the
  // viewer, then the stack comes apart under it. A little later the first control of the
  // interface is pointed out, until the visitor uses anything.
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(motion.matches);
    const onMotion = () => setReduced(motion.matches);
    motion.addEventListener('change', onMotion);
    let timer = 0, cue = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      // The first arrival lets the interface be seen square on; a project swap opens sooner.
      timer = window.setTimeout(() => setArrived(true), motion.matches ? 0 : arrivedOnce ? 220 : 450);
      arrivedOnce = true;
      cue = window.setTimeout(() => {
        if (touched.current) return;
        world.current?.querySelector('[data-layer="interface"] .mini [data-flow]:not(:disabled)')?.classList.add('xp-cue');
      }, 450 + CUE_AFTER);
    }, { threshold: 0.45 });
    observer.observe(viewport.current!);
    return () => { observer.disconnect(); clearTimeout(timer); clearTimeout(cue); motion.removeEventListener('change', onMotion); };
  }, []);

  // z of each plate along its normal, and its step towards the viewer.
  const zOf = useCallback((id: LayerId) => {
    if (pose === 'focus') return id === layer ? 2 : 0;
    return ORDER.indexOf(id as (typeof ORDER)[number]) * size.gap * spread;
  }, [pose, layer, size.gap, spread]);
  const stepOf = useCallback((id: LayerId) => pose === 'exploded' ? (3 - ORDER.indexOf(id as (typeof ORDER)[number])) * size.step : 0, [pose, size.step]);

  const live = useRef({ zOf, stepOf, size, reduced, pose, project });
  live.current = { zOf, stepOf, size, reduced, pose, project };

  /** Where an element sits in its plate, in world space. */
  const pointOf = useCallback((element: Element | null, id: LayerId): Point | null => {
    const root = world.current;
    const plate = root?.querySelector<HTMLElement>(`[data-layer="${id}"]`);
    if (!element || !plate || !(element instanceof HTMLElement) || !element.offsetParent) return null;
    const { zOf: z, stepOf: step, size: { pw, ph } } = live.current;
    let x = element.offsetWidth / 2, y = element.offsetHeight / 2;
    let current: HTMLElement | null = element;
    while (current && current !== plate) {
      x += current.offsetLeft; y += current.offsetTop;
      const parent: HTMLElement | null = current.offsetParent as HTMLElement | null;
      for (let up: HTMLElement | null = current.parentElement; up && up !== parent; up = up.parentElement) { x -= up.scrollLeft; y -= up.scrollTop; }
      current = parent;
    }
    return { x: x - pw / 2, y: y - ph / 2 + step(id), z: z(id) + 1 };
  }, []);
  const find = useCallback((id: LayerId, name?: string) => name ? world.current?.querySelector<HTMLElement>(`[data-layer="${id}"] [data-node="${CSS.escape(name)}"]`) ?? null : null, []);

  const run = useCallback((flow: Flow, from: HTMLElement) => {
    touched.current = true;
    const root = world.current, layerRays = rays.current;
    if (!root || !layerRays) return;
    root.querySelectorAll('.xp-cue').forEach(element => element.classList.remove('xp-cue'));
    const { reduced: still, pose: now } = live.current;
    const stops = [
      { point: pointOf(from, 'interface'), element: null as HTMLElement | null, badge: '' },
      { point: pointOf(find('services', flow.service), 'services'), element: find('services', flow.service), badge: flow.method },
      { point: pointOf(find('data', flow.table), 'data'), element: find('data', flow.table), badge: flow.op },
      { point: flow.infra ? pointOf(find('infra', flow.infra), 'infra') : null, element: find('infra', flow.infra), badge: '' },
    ].filter(stop => stop.point) as { point: Point; element: HTMLElement | null; badge: string }[];

    // Each stop is stamped with what happened there as the point reaches it; the table also
    // shows the row being written, on top of its columns.
    stops.forEach((stop, i) => {
      const element = stop.element;
      if (!element) return;
      window.setTimeout(() => {
        element.classList.remove('is-hit');
        if (stop.badge) element.dataset.badge = stop.badge; else delete element.dataset.badge;
        void element.offsetWidth;
        element.classList.add('is-hit');
        window.setTimeout(() => element.classList.remove('is-hit'), HOLD + 900);
        const columns = element.querySelector('.xp-cols');
        if (columns) {
          const row = document.createElement('span');
          row.className = 'xp-row-new';
          row.dataset.op = flow.op;
          const code = document.createElement('code');
          code.textContent = rowOf(flow.sql);
          row.append(code);
          columns.querySelectorAll('.xp-row-new').forEach(old => old.remove());
          columns.prepend(row);
          window.setTimeout(() => row.remove(), ROW_HOLD);
        }
      }, still ? 0 : i * RAY_DRAW);
    });
    // Head-on, the other plates are put away: the panel spells the request out instead.
    if (still || stops.length < 2 || now !== 'exploded') return;

    const path = stops.map(stop => stop.point);
    const down = RAY_DRAW * (path.length - 1);
    const back = RAY_BACK * (path.length - 1);
    const group = document.createElement('div');
    group.className = 'xp-flow';
    // Callout lines drawing themselves from stop to stop.
    path.slice(0, -1).forEach((a, i) => {
      const ray = document.createElement('i');
      ray.className = 'xp-ray';
      Object.assign(ray.style, beam(a, path[i + 1]));
      ray.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: RAY_DRAW, delay: i * RAY_DRAW, fill: 'backwards', easing: 'cubic-bezier(.3,0,.2,1)' });
      group.append(ray);
    });
    // The meeting point travels the request down; the response climbs back as a ring.
    const point = document.createElement('b');
    point.className = 'xp-pulse';
    point.animate(path.map(p => ({ transform: at(p) })), { duration: down, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'both' });
    group.append(point);
    const reply = document.createElement('b');
    reply.className = 'xp-pulse xp-reply';
    reply.animate([...path].reverse().map(p => ({ transform: at(p) })), { duration: back, delay: down + 160, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'both' });
    reply.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1 }], { duration: back, delay: down + 160, fill: 'both' });
    group.append(reply);
    // A ring opens at every stop, and back at the control when the response lands. The place
    // is set on an outer box and the ring scales inside it, so the two never fight.
    path.forEach((p, i) => {
      const place = document.createElement('b');
      place.className = 'xp-ring-at';
      place.style.transform = at(p);
      const ring = document.createElement('i');
      ring.className = 'xp-ring';
      ring.animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(.3)', opacity: 1, offset: 0.01 }, { transform: 'scale(2)', opacity: 0 }], { duration: 1100, delay: i ? i * RAY_DRAW : down + 160 + back, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
      place.append(ring);
      group.append(place);
    });
    layerRays.append(group);
    // Fade each piece, never the group: opacity on a preserve-3d parent flattens it.
    const fades = [...group.querySelectorAll('.xp-ray, .xp-pulse:not(.xp-reply)')].map(child => child.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, delay: down + back + HOLD, fill: 'forwards' }).finished);
    Promise.all(fades).then(() => window.setTimeout(() => group.remove(), 1200), () => group.remove());
  }, [find, pointOf]);

  // X-ray: everything a control, module, table or system is connected to, drawn before use.
  const shown = useRef<Element | null>(null);
  const clearXray = useCallback(() => {
    shown.current = null;
    xray.current?.replaceChildren();
    world.current?.querySelectorAll('.is-related').forEach(element => element.classList.remove('is-related'));
    viewport.current?.removeAttribute('data-xray');
  }, []);
  const showXray = useCallback((source: Element) => {
    if (shown.current === source) return;
    clearXray();
    const root = world.current, group = xray.current;
    if (!root || !group || live.current.pose !== 'exploded') return;
    shown.current = source;
    const { project: p } = live.current;
    const flowId = source.getAttribute('data-flow');
    const plate = source.closest<HTMLElement>('[data-layer]')?.dataset.layer as LayerId | undefined;
    const nodeId = source.getAttribute('data-node');
    const flows = Object.entries(p.flows).filter(([id, f]) => flowId ? id === flowId
      : plate === 'services' ? f.service === nodeId : plate === 'data' ? f.table === nodeId : plate === 'infra' ? f.infra === nodeId : false);
    if (!flows.length) return;
    viewport.current?.setAttribute('data-xray', '');
    const lines = new Set<string>();
    const draw = (a: Point | null, b: Point | null) => {
      if (!a || !b) return;
      const key = `${a.x},${a.y},${a.z}>${b.x},${b.y},${b.z}`;
      if (lines.has(key)) return;
      lines.add(key);
      const line = document.createElement('i');
      line.className = 'xp-link';
      Object.assign(line.style, beam(a, b));
      group.append(line);
    };
    for (const [id, f] of flows) {
      const controls = flowId ? [source as HTMLElement] : [...root.querySelectorAll<HTMLElement>(`[data-layer="interface"] [data-flow="${id}"]`)].slice(0, 3);
      const service = find('services', f.service), table = find('data', f.table), infra = find('infra', f.infra);
      for (const element of [...controls, service, table, infra]) element?.classList.add('is-related');
      const s = pointOf(service, 'services'), d = pointOf(table, 'data'), i = pointOf(infra, 'infra');
      for (const control of controls) draw(pointOf(control, 'interface'), s);
      draw(s, d);
      draw(d, i);
    }
  }, [clearXray, find, pointOf]);

  // The guide: the brand's ring over the interface, moved by the guided run.
  const guide = useCallback((target: HTMLElement | null, press = false) => {
    const ring = cursor.current;
    if (!ring) return;
    if (!target) { ring.removeAttribute('data-on'); return; }
    const p = pointOf(target, 'interface');
    if (!p) return;
    const { size: { pw, ph } } = live.current;
    ring.style.transform = `translate(${p.x + pw / 2}px, ${p.y + ph / 2}px)`;
    ring.setAttribute('data-on', '');
    if (press) { ring.classList.remove('is-press'); void ring.offsetWidth; ring.classList.add('is-press'); }
  }, [pointOf]);

  useEffect(() => {
    register({
      run,
      find: selector => world.current?.querySelector<HTMLElement>(`[data-layer="interface"] .mini ${selector}`) ?? null,
      guide,
    });
  }, [register, run, guide]);
  useEffect(() => { if (pose !== 'exploded') { rays.current?.replaceChildren(); clearXray(); } }, [pose, clearXray]);
  useEffect(() => { if (!guided) guide(null); }, [guided, guide]);

  // The pointer: nothing moves under it (a target that moves away from the cursor cannot
  // be clicked). The interface only catches a highlight, and whatever is under the pointer
  // is x-rayed. Written straight to the style.
  const onHoverMove = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse' || press.current?.moved) return;
    const target = (event.target as Element).closest('[data-layer="interface"] [data-flow], .xp-node[data-node]');
    if (target) showXray(target); else if (shown.current) clearXray();
    if (live.current.reduced) return;
    const face = world.current?.querySelector<HTMLElement>('[data-layer="interface"] .xp-face');
    if (face) {
      const r = face.getBoundingClientRect();
      face.style.setProperty('--gx', `${(((event.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
      face.style.setProperty('--gy', `${(((event.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
    }
  };
  const onHoverLeave = () => clearXray();

  // Drag to turn the drawing (exploded pose only). Controls inside the plates keep their clicks.
  const press = useRef<{ id: number; x: number; y: number; pitch: number; yaw: number; moved: boolean } | null>(null);
  // Inside a 3D transform the browser can re-aim a click: touch tap adjustment, or a mouse
  // press whose release hit-tests a few pixels off, lands on the card around a button rather
  // than the button. Down and up on the same control, without travelling, always activates
  // that control, exactly once.
  const tap = useRef<{ id: number; x: number; y: number; control: HTMLElement } | null>(null);
  const onPointerDown = (event: React.PointerEvent) => {
    const control = event.button > 0 ? null : (event.target as Element).closest<HTMLElement>('[data-layer="interface"] .mini button:not(:disabled)');
    tap.current = control ? { id: event.pointerId, x: event.clientX, y: event.clientY, control } : null;
    // The visitor's own hand on the interface takes over from a guided run.
    if (guided && event.isTrusted && (event.target as Element).closest('[data-layer="interface"]')) onManual();
    if (pose !== 'exploded' || event.button > 0) return;
    if ((event.target as Element).closest('button, a, input, select, textarea, [data-no-orbit]')) return;
    press.current = { id: event.pointerId, x: event.clientX, y: event.clientY, pitch: turn.pitch, yaw: turn.yaw, moved: false };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    onHoverMove(event);
    if (tap.current && Math.hypot(event.clientX - tap.current.x, event.clientY - tap.current.y) > 10) tap.current = null;
    const p = press.current;
    if (!p || p.id !== event.pointerId) return;
    const dx = event.clientX - p.x, dy = event.clientY - p.y;
    if (!p.moved) {
      // On touch, a vertical gesture is the page scrolling, not a turn.
      if (Math.hypot(dx, dy) < DRAG_START) return;
      if (event.pointerType !== 'mouse' && Math.abs(dy) > Math.abs(dx)) { press.current = null; return; }
      p.moved = true;
      touched.current = true;
      clearXray();
      setDragging(true);
      viewport.current?.setPointerCapture(event.pointerId);
    }
    setTurn({
      yaw: clamp(p.yaw + dx * PER_PX, LIMIT.yawMin, LIMIT.yawMax),
      pitch: event.pointerType === 'mouse' ? clamp(p.pitch - dy * PER_PX, LIMIT.pitchMin, LIMIT.pitchMax) : p.pitch,
    });
  };
  const onPointerUp = (event: React.PointerEvent) => {
    const t = tap.current;
    tap.current = null;
    if (t && t.id === event.pointerId && event.type === 'pointerup') {
      // The click the browser sends next goes through if it reached the control; if it was
      // re-aimed elsewhere it is redirected to the control; if none comes, the control is clicked.
      let settled = false;
      const route = (e: Event) => {
        if (!e.isTrusted || settled) return;
        settled = true;
        document.removeEventListener('click', route, true);
        if (t.control.contains(e.target as globalThis.Node | null)) return;
        e.stopPropagation();
        e.preventDefault();
        if (t.control.isConnected) t.control.click();
      };
      document.addEventListener('click', route, true);
      window.setTimeout(() => {
        document.removeEventListener('click', route, true);
        if (!settled && t.control.isConnected) { settled = true; t.control.click(); }
      }, 350);
    }
    const p = press.current;
    press.current = null;
    if (p?.moved) {
      setDragging(false);
      // The click that ends a drag is not a choice of plate.
      const swallow = (e: Event) => { e.stopPropagation(); e.preventDefault(); };
      viewport.current?.addEventListener('click', swallow, { capture: true, once: true });
      window.setTimeout(() => viewport.current?.removeEventListener('click', swallow, { capture: true }), 0);
    }
    if (event.type === 'pointercancel') setDragging(false);
  };

  // Choosing a plate opens it in the panel. Bringing it to the front is asked for explicitly:
  // its callout a second time, or the panel's button — never a stray click on the plate.
  const choose = (id: LayerId, fromTag = false) => {
    if (fromTag && pose === 'exploded' && layer === id) onFocus(true);
    else onLayer(id);
  };

  const turned = turn.pitch !== size.pitch || turn.yaw !== size.yaw;
  const worldStyle = {
    '--pitch': `${pitch}deg`, '--yaw': `${yaw}deg`, '--fit': fitPose.fit,
    '--cx': `${fitPose.cx}px`, '--cy': `${fitPose.cy}px`, '--spread': spread,
  } as React.CSSProperties;
  const face = { more: t.more, roles: t.roles, routes: t.routes, columns: t.columns };
  return <div
    ref={viewport}
    className="xp-viewport"
    data-pose={pose}
    data-leaving={leaving || undefined}
    data-dragging={dragging || undefined}
    data-guided={guided || undefined}
    data-measured={measured || undefined}
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerLeave={onHoverLeave}
    onPointerUp={onPointerUp}
    onPointerCancel={onPointerUp}
  >
    <div className="xp-scene">
      <div ref={world} className="xp-world" style={worldStyle}>
        {/* A soft contact shadow where the stack would rest on the bench. */}
        <i className="xp-ground" style={{ transform: `translate3d(${-size.pw / 2}px, ${-size.ph / 2 + 3 * size.step * spread}px, -36px)` }} aria-hidden="true" />
        {/* Exploded-drawing guides: the four corners, from the bottom plate to the top one. */}
        {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([cx, cy], corner) => {
          const inset = 8;
          const x = cx * (size.pw / 2 - inset), y = cy * (size.ph / 2 - inset);
          return <i key={corner} className="xp-guide" style={beam({ x, y: y + 3 * size.step, z: 0 }, { x, y, z: 3 * size.gap })} />;
        })}
        {ORDER.map((id, i) => {
          const selected = layer === id;
          const hidden = pose === 'focus' && !selected;
          return <section
            key={id}
            className="xp-plate"
            data-layer={id}
            data-selected={selected || undefined}
            data-hover={hover === id || undefined}
            data-hidden={hidden || undefined}
            aria-label={labels[id]}
            style={{ '--z': zOf(id), '--y': stepOf(id), '--i': i, '--depth': 3 - i } as React.CSSProperties}
            onPointerEnter={event => { if (event.pointerType === 'mouse') setHover(id); }}
            onPointerLeave={() => setHover(current => current === id ? null : current)}
            // Using the live interface is not choosing its layer: the panel stays where the visitor left it.
            onClick={event => { if (!(event.target as Element).closest('.mini :is(button, input, a)')) choose(id); }}
          >
            <div className="xp-face">
              {id === 'interface'
                ? <>{children}<span ref={cursor} className="xp-guide-ring" aria-hidden="true"><img src="/brand/ring-orange.svg" alt="" width={28} height={28} /></span></>
                : <StackFace project={project} layer={id} t={face} selected={node} onNode={picked => { touched.current = true; onNode(id, picked); }} />}
            </div>
            <button type="button" className="xp-tag" data-selected={selected || undefined} onClick={event => { event.stopPropagation(); choose(id, true); }} tabIndex={-1} aria-hidden="true">
              <span className="xp-tag-name"><span>{String(4 - i).padStart(2, '0')}</span>{id === 'interface' ? interfaceLabel : labels[id]}</span>
              <span className="xp-tag-tech">{project.layers[id].tech.map(x => x.name).join(' · ')}</span>
            </button>
          </section>;
        })}
      </div>
      {/* Requests and x-rays are drawn in a twin world on top, so the plates never hide them. */}
      <div ref={over} className="xp-world xp-world-over" style={worldStyle} aria-hidden="true">
        <div ref={xray} className="xp-rays xp-xray" />
        <div ref={rays} className="xp-rays" />
      </div>
    </div>
    {pose === 'exploded' && turned && <button type="button" className="button button-secondary button-small xp-recentre" onClick={() => setTurn({ pitch: size.pitch, yaw: size.yaw })}>{t.reset}</button>}
    {pose === 'focus' && <button type="button" className="button button-secondary button-small xp-back" onClick={() => onFocus(false)}><span aria-hidden="true">←</span>{t.back}</button>}
  </div>;
}
