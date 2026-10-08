import type { CSSProperties, ReactNode } from 'react';
import type { Solution } from '@/data/site';

/*
  Technical drawings of each deliverable, in the brand's palette. Not stock "technology"
  imagery (manual p.20): each one is a plan of what is actually built. The orange point
  marks where value happens: contact, an approval, the latest figure, the checkout.
  Lines draw on with pathLength=1; --i staggers them.
*/
type Draw = { d: string; i: number };
const line = (d: string, i: number): Draw => ({ d, i });
const box = (x: number, y: number, w: number, h: number, r = 6) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;

const drawings: Record<Solution['id'], { lines: Draw[]; fills: [number, number, number, number][]; point: [number, number] }> = {
  sites: {
    lines: [
      line(box(20, 20, 440, 320, 12), 0), line('M20 56H460', 1), line(box(160, 32, 160, 12, 6), 2),
      line('M300 82H328M344 82H372M388 82H416', 3),
      line('M44 188H252M44 202H228', 5), line(box(44, 222, 112, 28, 14), 6),
      line(box(296, 112, 140, 138, 8), 4), line('M296 250A140 140 0 0 1 436 110', 5),
      line('M44 292H140M180 292H276M316 292H412M44 306H112M180 306H236M316 306H380', 7),
    ],
    fills: [[44, 76, 44, 12], [44, 120, 228, 18], [44, 146, 168, 18]],
    point: [138, 236],
  },
  sistemas: {
    lines: [
      line(box(20, 20, 440, 320, 12), 0), line('M124 20V340', 1), line('M124 64H460', 1),
      line(box(144, 34, 150, 14, 7), 2), line('M422 41a9 9 0 1 0 18 0a9 9 0 1 0 -18 0', 2),
      line('M40 88H100M40 112H94M40 162H92M40 186H98M40 210H86', 3),
      line(box(144, 88, 296, 24, 4), 4),
      line('M144 140H440M144 168H440M144 196H440M144 224H440M144 252H440', 5),
      line('M156 128H220M244 128H300M156 156H210M244 156H316M156 184H226M244 184H292M156 212H204M244 212H310M156 240H218M244 240H288', 6),
      line(`${box(376, 121, 48, 14, 7)}${box(376, 149, 48, 14, 7)}${box(376, 177, 48, 14, 7)}${box(376, 205, 48, 14, 7)}${box(376, 233, 48, 14, 7)}`, 7),
      line(box(352, 290, 88, 28, 14), 8),
    ],
    fills: [[40, 38, 56, 12], [32, 126, 80, 24]],
    point: [400, 156],
  },
  dashboards: {
    lines: [
      line(box(20, 20, 440, 320, 12), 0),
      line(`${box(40, 40, 124, 68, 8)}${box(178, 40, 124, 68, 8)}${box(316, 40, 124, 68, 8)}`, 1),
      line('M56 60H104M194 60H238M332 60H372', 2),
      line(box(40, 124, 262, 196, 8), 3), line('M62 296H282M62 296V146', 4),
      line('M62 280C96 272 112 238 146 242S196 212 222 202S262 174 276 164', 6),
      line(box(316, 124, 124, 196, 8), 3),
      line('M332 296H424', 4),
    ],
    fills: [[56, 76, 72, 16], [194, 76, 56, 16], [332, 76, 84, 16], [336, 236, 12, 60], [356, 206, 12, 90], [376, 222, 12, 74], [396, 180, 12, 116], [416, 196, 12, 100]],
    point: [276, 164],
  },
  ecommerce: {
    lines: [
      line(box(20, 20, 440, 320, 12), 0),
      line(`${box(40, 40, 100, 100, 8)}${box(156, 40, 100, 100, 8)}${box(40, 180, 100, 100, 8)}${box(156, 180, 100, 100, 8)}`, 1),
      line('M40 156H112M40 168H84M156 156H220M156 168H196M40 296H104M40 308H80M156 296H228M156 308H190', 2),
      line(box(276, 40, 164, 280, 10), 3), line('M296 70H360', 4),
      line(`${box(296, 92, 28, 28, 4)}${box(296, 136, 28, 28, 4)}${box(296, 180, 28, 28, 4)}`, 5),
      line('M336 100H404M336 112H372M336 144H396M336 156H364M336 188H410M336 200H376', 5),
      line('M296 234H420', 6),
      line(box(296, 258, 124, 34, 17), 7),
    ],
    fills: [[62, 62, 56, 56], [178, 62, 56, 56], [62, 202, 56, 56], [178, 202, 56, 56]],
    point: [402, 275],
  },
};

export function Schematic({ id, className }: { id: Solution['id']; className?: string }): ReactNode {
  const { lines, fills, point } = drawings[id];
  return <svg className={`schematic ${className ?? ''}`} viewBox="0 0 480 360" aria-hidden="true" data-id={id}>
    {fills.map(([x, y, w, h], i) => <rect key={i} className="schematic-fill" x={x} y={y} width={w} height={h} rx={3} style={{ '--i': i * 0.5 + 2 } as CSSProperties} />)}
    {lines.map(({ d, i }, k) => <path key={k} className="schematic-line" d={d} pathLength={1} style={{ '--i': i } as CSSProperties} />)}
    <circle className="schematic-halo" cx={point[0]} cy={point[1]} r={15} />
    <circle className="schematic-point" cx={point[0]} cy={point[1]} r={7} />
  </svg>;
}
