/*
  HubMonitor preview: reads the compact public summary of monitor.connectionshub.com.br on the
  server (never in the browser, so the site's CSP keeps connect-src 'self'). The home page is
  static; this fetch makes it regenerate at most every REVALIDATE seconds (ISR).
  When the monitor cannot be read, the section is not rendered: the site never shows stale or
  invented status. Contract: HubMonitor docs/openapi.json, GET /api/v1/summary.
*/
export const MONITOR_URL = (process.env.HUBMONITOR_PUBLIC_URL ?? 'https://monitor.connectionshub.com.br').replace(/\/$/, '');
/** Where the server reads from. Defaults to the public URL; set it to reach a local API in development. */
const API_URL = (process.env.HUBMONITOR_API_URL ?? MONITOR_URL).replace(/\/$/, '');
const REVALIDATE = 120;
const TIMEOUT_MS = 4000;

export type MonitorStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance' | 'unknown' | 'no_incident';
export type MonitorState = 'clear' | 'impact' | 'partial_data' | 'no_data';
export type MonitorService = {
  slug: string; name: string; category: string; status: MonitorStatus; stale: boolean;
  observedAt: string | null; activeIncidents: number; timeline: MonitorStatus[];
};
export type MonitorSummary = {
  generatedAt: string; state: MonitorState;
  summary: { total: number; fresh: number; affected: number; unknown: number; activeIncidents: number };
  services: MonitorService[];
};

const STATUSES = new Set<MonitorStatus>(['operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance', 'unknown', 'no_incident']);

/** Shape check on untrusted JSON: anything unexpected means "no preview", never a guess. */
function valid(data: unknown): data is MonitorSummary {
  const d = data as MonitorSummary;
  return !!d && typeof d.generatedAt === 'string' && ['clear', 'impact', 'partial_data', 'no_data'].includes(d.state)
    && Array.isArray(d.services) && d.services.length > 0 && d.services.length <= 50
    && d.services.every(s => typeof s.slug === 'string' && typeof s.name === 'string' && STATUSES.has(s.status)
      && typeof s.stale === 'boolean' && Array.isArray(s.timeline) && s.timeline.every(c => STATUSES.has(c)));
}

export async function getMonitorSummary(): Promise<MonitorSummary | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/summary`, { next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    return valid(data) ? data : null;
  } catch {
    return null;
  }
}
