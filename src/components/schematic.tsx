import type { CSSProperties, ReactNode } from 'react';
import type { SolutionId } from '@/data/site';
import type { Dictionary } from '@/i18n/types';

type Labels = Dictionary['solutions']['schematic'];

/*
  Technical drawings of each deliverable, in the brand's palette. Not stock "technology"
  imagery (manual p.20): each one is a plan of what is actually built — front-end composition
  for sites, integrated processes for systems, the path from data to decision for dashboards,
  the order flow for e-commerce. The orange point marks where value happens.

  Primitives draw on with pathLength=1; --i staggers them. Labels and values fade in after.
*/
type Draw = { i: number };
const r = (x: number, y: number, w: number, h: number, rad = 6) =>
  `M${x + rad} ${y}H${x + w - rad}A${rad} ${rad} 0 0 1 ${x + w} ${y + rad}V${y + h - rad}A${rad} ${rad} 0 0 1 ${x + w - rad} ${y + h}H${x + rad}A${rad} ${rad} 0 0 1 ${x} ${y + h - rad}V${y + rad}A${rad} ${rad} 0 0 1 ${x + rad} ${y}Z`;
const arrowHead = (x: number, y: number, dx: number, dy: number, s = 5) => {
  const l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  return `M${x - ux * s - uy * s * 0.7} ${y - uy * s + ux * s * 0.7}L${x} ${y}L${x - ux * s + uy * s * 0.7} ${y - uy * s - ux * s * 0.7}`;
};
const arrow = (x1: number, y1: number, x2: number, y2: number) => `M${x1} ${y1}L${x2} ${y2}${arrowHead(x2, y2, x2 - x1, y2 - y1)}`;
const tick = (x: number, y: number) => `M${x - 3} ${y + 3}L${x + 3} ${y - 3}`;

const style = (i: number) => ({ '--i': i } as CSSProperties);
const Line = ({ d, i, soft }: { d: string } & Draw & { soft?: boolean }) => <path className={soft ? 'sch-soft' : 'sch-line'} d={d} pathLength={1} style={style(i)} />;
const Fill = ({ d, i }: { d: string } & Draw) => <path className="sch-fill" d={d} style={style(i)} />;
const Label = ({ x, y, children, i, anchor = 'start', value }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; value?: boolean } & Draw) =>
  <text className={value ? 'sch-value' : 'sch-label'} x={x} y={y} textAnchor={anchor} style={style(i)}>{children}</text>;
const Point = ({ x, y }: { x: number; y: number }) => <>
  <circle className="sch-halo" cx={x} cy={y} r={13} />
  <circle className="sch-point" cx={x} cy={y} r={5.5} />
</>;

function Sites({ t }: { t: Labels['sites'] }) {
  return <>
    {/* Viewport rulers: one layout, two widths. */}
    <Line i={0} soft d={`M20 22H360${tick(20, 22)}${tick(360, 22)}M420 22H520${tick(420, 22)}${tick(520, 22)}`} />
    <Label i={0} x={190} y={16} anchor="middle" value>1440</Label>
    <Label i={0} x={470} y={16} anchor="middle" value>390</Label>
    {/* Desktop */}
    <Line i={1} d={`${r(20, 34, 340, 282, 10)}M20 54H360${r(130, 40, 120, 8, 4)}`} />
    <Line i={2} soft d={`${r(30, 62, 320, 22, 3)}${r(30, 92, 320, 96, 3)}${r(30, 196, 320, 62, 3)}${r(30, 266, 320, 40, 3)}`} />
    <Fill i={3} d={`${r(40, 68, 30, 10, 2)}${r(42, 106, 168, 14, 2)}${r(42, 126, 122, 14, 2)}`} />
    <Line i={3} d="M240 73H262M272 73H294M304 73H326M42 154H200M42 164H176" />
    <Line i={4} d={`${r(42, 174, 82, 8, 4)}${r(234, 104, 104, 72, 6)}M234 176A104 72 0 0 1 338 104`} />
    <Line i={5} d={`${r(42, 206, 92, 42, 5)}${r(144, 206, 92, 42, 5)}${r(246, 206, 92, 42, 5)}M52 236H112M154 236H214M256 236H316`} />
    <Line i={6} d="M42 280H124M42 290H96M200 280H260M276 280H336" />
    {/* Mobile: the same components, stacked */}
    <Line i={2} d={`${r(420, 34, 100, 282, 14)}`} />
    <Line i={3} soft d={`${r(428, 46, 84, 14, 3)}${r(428, 66, 84, 88, 3)}${r(428, 160, 84, 98, 3)}${r(428, 264, 84, 40, 3)}`} />
    <Fill i={4} d={`${r(434, 74, 62, 9, 2)}${r(434, 88, 44, 9, 2)}${r(434, 166, 72, 26, 3)}${r(434, 196, 72, 26, 3)}${r(434, 226, 72, 26, 3)}`} />
    <Line i={5} d={`M434 106H500M434 114H488${r(434, 128, 50, 10, 5)}M434 278H490M434 288H470`} />
    {/* Reflow mapping */}
    <Line i={6} soft d={`${arrow(350, 73, 426, 53)}${arrow(350, 140, 426, 110)}${arrow(350, 227, 426, 209)}${arrow(350, 286, 426, 284)}`} />
    <Label i={7} x={364} y={60}>{t.nav}</Label>
    <Label i={7} x={364} y={121}>{t.hero}</Label>
    <Label i={7} x={364} y={213}>{t.sections}</Label>
    <Label i={7} x={364} y={278}>{t.contact}</Label>
    <Point x={83} y={178} />
  </>;
}

function Sistemas({ t }: { t: Labels['sistemas'] }) {
  const modules = t.modules.map((name, k) => [name, 24 + k * 136] as const);
  return <>
    {/* Access profiles govern every module. */}
    <Line i={0} soft d={`${r(150, 12, 260, 22, 11)}M76 34V64M212 34V64M348 34V64M484 34V64M76 34H484`} />
    <Label i={1} x={280} y={27} anchor="middle">{t.profiles}</Label>
    {modules.map(([name, x], k) => <g key={name}>
      <Line i={1 + k} d={`${r(x, 64, 104, 86, 6)}M${x} 84H${x + 104}`} />
      <Label i={2 + k} x={x + 10} y={78}>{name}</Label>
      <Line i={2 + k} soft d={`M${x + 10} 98H${x + 94}M${x + 10} 110H${x + 94}M${x + 10} 122H${x + 94}M${x + 10} 134H${x + 94}`} />
      <Line i={3 + k} d={r(x + 66, 92, 28, 10, 5)} />
    </g>)}
    {/* The process runs through the modules, left to right. */}
    <Line i={5} d={`${arrow(128, 107, 158, 107)}${arrow(264, 107, 294, 107)}${arrow(400, 107, 430, 107)}`} />
    {/* One shared database: every module reads and writes the same records. */}
    <Line i={6} d={`M76 150V200${arrowHead(76, 200, 0, 1)}M212 150V200${arrowHead(212, 200, 0, 1)}M348 150V200${arrowHead(348, 200, 0, 1)}M484 150V200${arrowHead(484, 200, 0, 1)}`} />
    <Fill i={7} d={r(24, 204, 512, 40, 8)} />
    <Line i={7} d={r(24, 204, 512, 40, 8)} />
    <Label i={8} x={280} y={228} anchor="middle" value>{t.database}</Label>
    {/* Integration with what already exists, and reports out. */}
    <Line i={8} soft d={`${r(24, 282, 220, 40, 6)}${arrow(134, 282, 134, 248)}`} />
    <Label i={9} x={134} y={306} anchor="middle">{t.sheets}</Label>
    <Line i={8} d={`${r(316, 282, 220, 40, 6)}${arrow(426, 244, 426, 280)}`} />
    <Label i={9} x={426} y={306} anchor="middle">{t.reports}</Label>
    <Label i={9} x={142} y={268}>{t.integration}</Label>
    <Point x={280} y={204} />
  </>;
}

function Dashboards({ t }: { t: Labels['dashboards'] }) {
  const sources = t.sources.map((name, k) => [name, 30 + k * 62] as const);
  return <>
    {sources.map(([name, y], k) => <g key={name}>
      <Line i={k} d={r(16, y, 112, 34, 6)} />
      <Label i={1 + k} x={72} y={y + 21} anchor="middle">{name}</Label>
    </g>)}
    {/* Sources are cleaned and combined before they become indicators. */}
    <Line i={3} soft d={`M128 47H140V108M128 109H140M128 171H140V110${arrow(140, 109, 156, 109)}`} />
    <Line i={4} d={r(158, 90, 78, 38, 6)} />
    <Label i={5} x={197} y={113} anchor="middle">{t.processing}</Label>
    <Line i={5} d={arrow(236, 109, 262, 109)} />
    {/* The dashboard: filters, indicators, a trend against its target, distribution. */}
    <Line i={5} d={r(264, 14, 282, 306, 10)} />
    <Line i={6} soft d={`${r(278, 28, 66, 16, 8)}${r(350, 28, 66, 16, 8)}`} />
    <Label i={7} x={311} y={39} anchor="middle">{t.period}</Label>
    <Label i={7} x={383} y={39} anchor="middle">{t.unit}</Label>
    <Line i={6} d={`${r(278, 54, 80, 46, 6)}${r(366, 54, 80, 46, 6)}${r(454, 54, 80, 46, 6)}`} />
    <Fill i={7} d={`${r(288, 76, 52, 12, 2)}${r(376, 76, 38, 12, 2)}${r(464, 76, 58, 12, 2)}`} />
    <Line i={7} soft d="M288 66H322M376 66H404M464 66H500" />
    <Line i={8} d={`${r(278, 110, 256, 120, 6)}M292 216H522M292 216V124`} />
    <Line i={8} soft d="M292 158H522" />
    <Label i={9} x={298} y={153}>{t.target}</Label>
    <Line i={9} d="M296 206C322 200 334 186 356 190S398 176 420 170S458 154 474 150S500 140 512 134" />
    <Label i={11} x={494} y={128} anchor="end">{t.decision}</Label>
    <Line i={9} d={`${r(278, 240, 256, 66, 6)}`} />
    <Fill i={10} d={`${r(294, 270, 14, 26, 2)}${r(318, 258, 14, 38, 2)}${r(342, 276, 14, 20, 2)}${r(366, 252, 14, 44, 2)}${r(390, 264, 14, 32, 2)}${r(414, 248, 14, 48, 2)}${r(438, 260, 14, 36, 2)}${r(462, 254, 14, 42, 2)}${r(486, 266, 14, 30, 2)}${r(510, 250, 14, 46, 2)}`} />
    <Point x={512} y={134} />
  </>;
}

function Ecommerce({ t }: { t: Labels['ecommerce'] }) {
  const flow = t.flow;
  return <>
    {/* Product page */}
    <Line i={0} d={r(16, 14, 204, 228, 10)} />
    <Line i={1} d={`${r(28, 26, 180, 108, 6)}M118 112A30 30 0 1 1 118.1 112`} />
    <Fill i={2} d={`${r(28, 146, 140, 12, 2)}${r(28, 166, 64, 14, 2)}`} />
    <Line i={2} soft d="M28 194H190M28 204H160" />
    <Line i={3} d={r(28, 216, 104, 18, 9)} />
    <Label i={4} x={80} y={229} anchor="middle">{t.add}</Label>
    <Line i={4} d={arrow(220, 225, 250, 225)} />
    {/* Checkout */}
    <Line i={1} d={r(252, 14, 292, 228, 10)} />
    <Label i={2} x={266} y={34}>{t.checkout}</Label>
    <Line i={2} soft d="M400 30H520M400 30A4 4 0 1 0 400.1 30M460 30A4 4 0 1 0 460.1 30M520 30A4 4 0 1 0 520.1 30" />
    <Line i={3} d={`${r(266, 46, 130, 18, 4)}${r(404, 46, 126, 18, 4)}${r(266, 72, 264, 18, 4)}${r(266, 98, 130, 18, 4)}${r(404, 98, 126, 18, 4)}`} />
    <Label i={4} x={266} y={136}>{t.payment}</Label>
    <Line i={4} d={`${r(266, 144, 82, 30, 5)}${r(356, 144, 82, 30, 5)}${r(446, 144, 84, 30, 5)}M280 159A5 5 0 1 0 280.1 159`} />
    <Label i={5} x={266} y={196}>{t.shipping}</Label>
    <Line i={5} soft d="M310 192H530M266 206H530" />
    <Label i={6} x={530} y={196} anchor="end" value>{t.total}</Label>
    <Line i={6} d={r(400, 214, 130, 20, 10)} />
    <Label i={7} x={465} y={228} anchor="middle">{t.finish}</Label>
    {/* The order flow, end to end, integrated with stock and the company's system. */}
    <Line i={6} d="M40 280H520" />
    {flow.map((step, k) => <g key={step}>
      <Line i={7 + k * 0.5} d={`M${40 + k * 96} 274A6 6 0 1 0 ${40.1 + k * 96} 274`} />
      <Label i={8 + k * 0.5} x={40 + k * 96} y={302} anchor="middle">{step}</Label>
    </g>)}
    <Fill i={8} d="M232 280m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0" />
    <Point x={512} y={224} />
  </>;
}

function Drawing({ id, t }: { id: SolutionId; t: Labels }) {
  if (id === 'sites') return <Sites t={t.sites} />;
  if (id === 'sistemas') return <Sistemas t={t.sistemas} />;
  if (id === 'dashboards') return <Dashboards t={t.dashboards} />;
  return <Ecommerce t={t.ecommerce} />;
}

/** drawOnView: draws itself in when scrolled into view (see [data-draw] in scroll-effects.tsx). */
export function Schematic({ id, labels, className, drawOnView }: { id: SolutionId; labels: Labels; className?: string; drawOnView?: boolean }) {
  return <svg className={`schematic ${className ?? ''}`} viewBox="0 0 560 330" aria-hidden="true" data-id={id} data-draw={drawOnView || undefined}>
    <Drawing id={id} t={labels} />
  </svg>;
}
