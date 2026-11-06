import { SectionHead } from '@/components/section-head';
import { SecurityShowcase } from '@/components/security/shield';
import type { Dictionary } from '@/i18n';

/*
  02b — Security, right after About. One message: the sites Connections Hub builds are
  secure. Each pillar opens a short story (components/security/shield.tsx) that plays the
  same scam on an ordinary site and on ours, so anyone gets it without technical words.
  Every claim is configured in src/lib/security-headers.ts.
*/
export function Security({ t }: { t: Dictionary['security'] }) {
  return <section id="seguranca" className="security" aria-labelledby="security-title">
    <SecurityShowcase t={t} head={<SectionHead label={t.label} id="security-title" lines={t.title} intro={t.lead} />} />
  </section>;
}
