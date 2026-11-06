import { Journey } from '@/components/process/journey';
import { SectionHead } from '@/components/section-head';
import type { Dictionary } from '@/i18n';

// 04 — Process. Names verbatim from the brand; each step states what the client receives,
// and the journey (components/process/journey.tsx) shows it happening on an example project.
export function Process({ t }: { t: Dictionary['process'] }) {
  return <section id="processo" className="process" aria-labelledby="process-title">
    <div className="shell">
      <SectionHead label={t.label} id="process-title" lines={t.title} intro={t.intro} />
      <Journey t={t} />
    </div>
  </section>;
}
