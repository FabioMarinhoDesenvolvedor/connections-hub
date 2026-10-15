'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { InfraRole, LayerId, Node, Project } from '@/data/projects';

/*
  The face of a stack plate, each layer in its own material:
  - services: a dark board of modules, each with a real route (or signature) and its size;
  - data: an entity diagram on paper, tables with real columns, foreign keys drawn as lines;
  - infrastructure: outside systems on a network bus, each with its role.
  The plate above covers most of this one, so everything sits in the band along the near
  edge, which stays in view; what the live interface can reach goes last, nearest that edge.
  Every node carries data-node so a flow can find it and light it up, and can be chosen.
*/
type Copy = { more: string; roles: Record<InfraRole, string>; routes: string; columns: string };

const fill = (template: string, n: number) => template.replace('{n}', String(n));
/** Long code names break after _ and . instead of being cut. */
const breakable = (label: string) => label.split(/(?<=[_.])/).flatMap((part, i) => i ? [<wbr key={i} />, part] : [part]);
const monogram = (label: string) => label.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

export function StackFace({ project, layer, t, selected, onNode }: {
  project: Project;
  layer: Exclude<LayerId, 'interface'>;
  t: Copy;
  selected?: string;
  onNode: (node: Node) => void;
}) {
  const { nodes: all, more: extra } = project.layers[layer];
  const reached = new Set(Object.values(project.flows).map(flow => layer === 'services' ? flow.service : layer === 'data' ? flow.table : flow.infra));
  const nodes = [...all.filter(node => !reached.has(node.id)), ...all.filter(node => reached.has(node.id))];
  const list = useRef<HTMLUListElement>(null);
  const [links, setLinks] = useState<string[]>([]);

  // Foreign keys, drawn between the tables they join (layout space, so the 3D never skews them).
  useLayoutEffect(() => {
    if (layer !== 'data' || !list.current) return;
    const element = list.current;
    const draw = () => {
      const box = (id: string) => {
        const node = element.querySelector<HTMLElement>(`[data-node="${CSS.escape(id)}"]`);
        return node && node.offsetParent ? { x: node.offsetLeft, y: node.offsetTop, w: node.offsetWidth, h: node.offsetHeight } : null;
      };
      const paths: string[] = [];
      for (const node of nodes) for (const target of node.links ?? []) {
        const a = box(node.id), b = box(target);
        if (!a || !b) continue;
        const ax = a.x + a.w / 2, ay = a.y + 12, bx = b.x + b.w / 2, by = b.y + 12;
        if (Math.abs(ay - by) < 4) {
          // Same row: an arc over the cards' headers.
          const top = Math.min(ay, by) - 26;
          paths.push(`M${ax} ${ay}C${ax} ${top} ${bx} ${top} ${bx} ${by}`);
        } else {
          const mid = (ay + by) / 2;
          paths.push(`M${ax} ${ay}C${ax} ${mid} ${bx} ${mid} ${bx} ${by}`);
        }
      }
      setLinks(paths);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(element);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer, project.id]);

  return <div className="xp-stack" data-kind={layer}>
    {layer === 'infra' && <span className="xp-bus" aria-hidden="true" />}
    <ul ref={list} className="xp-nodes" style={{ '--count': nodes.length + (extra ? 1 : 0) } as React.CSSProperties}>
      {layer === 'data' && <svg className="xp-erd" aria-hidden="true">{links.map((d, i) => <path key={i} d={d} />)}</svg>}
      {extra ? <li className="xp-node xp-node-more"><code>{fill(t.more, extra)}</code></li> : null}
      {nodes.map(node => <li
        key={node.id}
        className="xp-node"
        data-node={node.id}
        data-reached={reached.has(node.id) || undefined}
        data-selected={selected === node.id || undefined}
        onClick={event => { event.stopPropagation(); onNode(node); }}
      >
        {layer === 'services' && <>
          <span className="xp-node-head"><span className="xp-led" aria-hidden="true" /><code>{node.label}</code></span>
          <small>{node.count ? <><code>{node.meta}</code> · {fill(t.routes, node.count)}</> : <code>{node.meta}</code>}</small>
        </>}
        {layer === 'data' && <>
          <span className="xp-node-head"><code>{breakable(node.label)}</code>{node.count ? <em>{node.count}</em> : null}</span>
          <span className="xp-cols">
            {(node.columns ?? []).slice(0, 3).map(column => {
              const [name, ref] = column.split(' →');
              return <span key={column} data-fk={ref ? true : undefined}><code>{name}</code>{ref && <i aria-hidden="true">→</i>}</span>;
            })}
          </span>
        </>}
        {layer === 'infra' && <>
          <span className="xp-glyph" aria-hidden="true">{monogram(node.label)}</span>
          <span className="xp-node-head"><code>{breakable(node.label)}</code></span>
          {node.role && <small>{t.roles[node.role]}</small>}
        </>}
      </li>)}
    </ul>
  </div>;
}
