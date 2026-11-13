import { Arrow } from '@/components/arrow';
import { SectionHead } from '@/components/section-head';
import type { Dictionary } from '@/i18n';
import { getMonitorSummary, MONITOR_URL, type MonitorStatus } from '@/lib/monitor';

/*
  HubMonitor preview, right before Projects: a live window onto monitor.connectionshub.com.br,
  the studio's own product. Read on the server (src/lib/monitor.ts); absent when the monitor
  cannot be read, so nothing here is ever a placeholder. Stale sources show as "no current
  reading", never as their last status. Colour is never the only signal: every state has text.
*/
const TONE: Record<MonitorStatus, string> = {
  operational: 'ok', no_incident: 'neutral', maintenance: 'info', degraded: 'warn',
  partial_outage: 'crit', major_outage: 'crit', unknown: 'unknown',
};

export async function Monitor({ t, locale }: { t: Dictionary['monitor']; locale: string }) {
  const data = await getMonitorSummary();
  if (!data) return null;
  const read = new Intl.DateTimeFormat(locale, { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(new Date(data.generatedAt));
  const affected = data.services.filter(s => !s.stale && ['degraded', 'partial_outage', 'major_outage'].includes(s.status));
  const headline = data.state === 'impact' ? (affected.length === 1 ? t.state.impactOne : t.state.impact.replace('{n}', String(affected.length))) : t.state[data.state];
  const tone = data.state === 'impact' ? 'warn' : data.state === 'clear' ? 'ok' : 'unknown';

  return <section id="monitor" className="monitor surface-deep" aria-labelledby="monitor-title">
    <div className="shell monitor-grid">
      <div className="monitor-copy">
        <SectionHead label={t.label} id="monitor-title" lines={t.title} intro={t.intro} />
        <div className="actions" data-reveal>
          <a className="button button-light" href={MONITOR_URL}>{t.open}<Arrow /></a>
        </div>
        <p className="monitor-note" data-reveal>{t.note}</p>
      </div>

      <figure className="monitor-window" data-reveal aria-label={t.windowLabel}>
        <div className="monitor-bar">
          <span className="monitor-host">{MONITOR_URL.replace(/^https?:\/\//, '')}</span>
          <span className="monitor-read"><span className="monitor-live" aria-hidden="true" />{t.read.replace('{time}', read)}</span>
        </div>
        <p className={`monitor-state tone-${tone}`}><span className="monitor-dot" aria-hidden="true" />{headline}</p>
        <div className="monitor-axis" aria-hidden="true"><span /><span /><span className="monitor-scale"><span>{t.axis.start}</span><span>{t.axis.now}</span></span></div>
        <ul className="monitor-rows">
          {data.services.map(s => {
            const status: MonitorStatus = s.stale ? 'unknown' : s.status;
            return <li key={s.slug}>
              <span className="monitor-name">{s.name}<small>{s.category}</small></span>
              <span className={`monitor-status tone-${TONE[status]}`}><span className="monitor-dot" aria-hidden="true" />{s.stale ? t.stale : t.status[status]}</span>
              <span className="monitor-strip" role="img" aria-label={t.stripLabel.replace('{name}', s.name)}>
                {s.timeline.map((c, i) => <i key={i} className={`tone-${TONE[c]}`} />)}
              </span>
            </li>;
          })}
        </ul>
        <figcaption className="monitor-caption">{t.caption}</figcaption>
      </figure>
    </div>
  </section>;
}
